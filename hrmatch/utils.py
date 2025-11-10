import os
import re
from datetime import datetime, timedelta
import pymongo
from pdfminer.high_level import extract_text
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from llama_cpp import Llama
import uuid
from typing import List, Dict, Any, Optional

# ✅ Load embedding model once
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# ✅ MongoDB connection (READ ONLY)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = pymongo.MongoClient(MONGO_URI)
db = client["Andgate_Portal"]
uploads_collection = db["uploads"]

# ✅ Load Mistral model (CPU)
# PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# UPLOADS_DIR = os.path.join(PROJECT_ROOT, "AndgatePortal-1","backend","src", "uploads")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(os.path.dirname(PROJECT_ROOT))
UPLOADS_DIR = os.path.join(BASE_DIR, "AndgatePortal-1","backend","src","uploads")

model_path = os.path.join(PROJECT_ROOT, "chatbot", "models", "mistral-7b-instruct-v0.1.Q4_0.gguf")
# ✅ Load model
mistral = Llama(
    model_path=model_path,
    n_ctx=4096,
    n_threads=4,
    verbose=False
)

# ✅ Global memory for HR conversation (NO DATABASE)
session_memory = {
    "session_id": None,
    "hr_query": None,
    "candidate_list": [],
    "next_offset": 0,
    "messages": []
}


# ✅ Extract text from PDF
def decode_pdf_from_path(file_path):
    try:
        # Convert relative DB path → correct uploads folder
        if not os.path.isabs(file_path):
            file_path = os.path.join(UPLOADS_DIR, os.path.basename(file_path))

        if os.path.exists(file_path):
            return extract_text(file_path)
        else:
            print("❌ File not found:", file_path)
            return None
    except Exception as e:
        print("❌ PDF decode error:", e)
        return None

# ✅ Experience extractor
def extract_experience_years(text):
    patterns = [
        r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
        r'experience[:\s]+(\d+)\+?\s*years?',
        r'(\d+)\+?\s*yrs?\s+(?:of\s+)?experience',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return float(m.group(1))
    return 0.0
def extract_required_skills(query):
    words = re.findall(r'[a-zA-Z]+', query.lower())
    common_noise = {"developer", "engineer", "years", "experience", "with", "and", "in", "of"}
    return [w for w in words if w not in common_noise]
    

def extract_required_experience(query):
    match = re.search(r'(\d+)\s*(?:\+)?\s*years?', query)
    return int(match.group(1)) if match else 0


GREETING_INTENTS = [
    "hello", "hi", "hey", "good morning", "good afternoon",
    "good evening", "greetings", "how are you"
]

def is_greeting(query):
    q_emb = embedding_model.encode([query])[0]
    g_embs = embedding_model.encode(GREETING_INTENTS)
    sims = cosine_similarity([q_emb], g_embs)[0]
    return max(sims) > 0.70


# ✅ Extract name from filename
def extract_candidate_name(filename):
    name = os.path.splitext(filename)[0]
    name = re.sub(r'[_\-\d]+', ' ', name)
    return name.strip()


# ✅ Search resumes matching query
def semantic_vector_search(query_text, resume_data_list):

    query_embedding = embedding_model.encode([query_text])[0]
    resume_embeddings = embedding_model.encode([r['text'] for r in resume_data_list])

    similarities = cosine_similarity([query_embedding], resume_embeddings)[0]

    for i, resume in enumerate(resume_data_list):

        resume["similarity_score"] = float(similarities[i])
        resume["experience_years"] = extract_experience_years(resume["text"])

        # recency score for 90-day filter
        days_old = (datetime.now() - resume["last_updated"]).days
        recency_score = max(0, 1 - (days_old / 365))

        exp_score = min(resume["experience_years"] / 15.0, 1.0)

        resume["rank_score"] = (
            (resume['similarity_score'] * 0.7) +
            (exp_score * 0.2) +
            (recency_score * 0.1)
        )

    return sorted(resume_data_list, key=lambda x: x["rank_score"], reverse=True)


# ✅ AI Summary from Candidates
def generate_ai_summary(candidates, user_query):
    names = ", ".join([extract_candidate_name(c['filename']) for c in candidates])

    prompt = f"""
You are an AI HR assistant. Only use the given candidates.
Do not hallucinate.

HR Query: "{user_query}"
Candidates: {names}

Provide a short, professional summary.
Always end with: "Please let me know if you need further assistance."
"""

    output = mistral(
        prompt,
        max_tokens=520,
        temperature=0.2,
        stop=["</s>"]
    )

    return output["choices"][0]["text"].strip()


# ✅ Create in-memory HR session
def create_session(user_query, candidate_ids):
    session_memory["session_id"] = "session_" + str(uuid.uuid4())
    session_memory["hr_query"] = user_query
    session_memory["candidate_list"] = candidate_ids
    session_memory["next_offset"] = 0
    session_memory["messages"] = []
    return session_memory["session_id"]


# ✅ Load next N candidates WITHOUT re-searching
def get_next_candidates(n):
    start = session_memory["next_offset"]
    end = start + n
    session_memory["next_offset"] = end

    return session_memory["candidate_list"][start:end]


def hr_search(query_text, top_k=5):

    required_skills = extract_required_skills(query_text)
    required_years = extract_required_experience(query_text)

    ninety_days_ago = datetime.now() - timedelta(days=90)

    docs = uploads_collection.find({
        "fileType": "pdf",
        "updatedAt": {"$gte": ninety_days_ago}
    })

    resumes = []
    for doc in docs:
        text = decode_pdf_from_path(doc["filePath"])
        if not text:
            continue

        exp_years = extract_experience_years(text)

        # ✅ HARD FILTER: experience
        if exp_years < required_years:
            continue

        # ✅ SOFT FILTER: match 1 or more skills
        skill_matches = sum(1 for skill in required_skills if skill.lower() in text.lower())
        if required_skills and skill_matches == 0:
            continue

        resumes.append({
            "_id": str(doc["_id"]),
            "filename": doc["fileName"],
            "filePath": doc["filePath"],
            "text": text,
            "experience_years": exp_years,
            "skill_matches": skill_matches,
            "last_updated": doc["updatedAt"]
        })

    if not resumes:
        return "❌ No candidates found that match required skills or experience."

    # ✅ RANK: similarity + experience + recency + matched skills
    for r in resumes:
        r_emb = embedding_model.encode([r["text"]])[0]
        q_emb = embedding_model.encode([query_text])[0]
        sim = cosine_similarity([q_emb], [r_emb])[0][0]

        recency_score = max(0, 1 - ((datetime.now() - r["last_updated"]).days / 365))
        exp_score = min(r["experience_years"] / 15.0, 1.0)
        skill_score = r["skill_matches"] / max(len(required_skills), 1)

        r["rank_score"] = (sim * 0.5) + (exp_score * 0.2) + (recency_score * 0.1) + (skill_score * 0.2)

    sorted_list = sorted(resumes, key=lambda x: x["rank_score"], reverse=True)

    create_session(query_text, sorted_list)
    initial = get_next_candidates(top_k)

    summary = generate_ai_summary(initial, query_text)

    cleaned = [
        {
            "_id": c["_id"],
            "filename": c["filename"],
            "filePath": c["filePath"],
            "experience": c["experience_years"],
            "matched_skills": c["skill_matches"],
            "updated_at": c["last_updated"]
        }
        for c in initial
    ]

    return {
        "session_id": session_memory["session_id"],
        "results": len(cleaned),
        "candidates": cleaned,
        "summary": summary
    }


# ✅ Next candidates when HR says: "next 3" / "next 5"
def hr_next(n=3):
    nxt = get_next_candidates(n)

    if not nxt:
        return "✅ No more candidates matching the previous query."

    summary = generate_ai_summary(nxt, session_memory["hr_query"])
    cleaned = [
        {
            "_id": c["_id"],
            "filename": c["filename"],
            "filePath": c.get("filePath"),
            "experience": c["experience_years"],
            "updated_at": c["last_updated"]
        }
        for c in nxt
    ]

    return {
        "results": len(cleaned),
        "candidates": cleaned,
        "summary": summary
        
    }























