import os
import re
import json
import base64
import fitz
import pymongo
import logging
import warnings
from bson import ObjectId
from datetime import datetime, timedelta
from pathlib import Path
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from llama_cpp import Llama
from chatbot.offline_loader import OfflineSentenceTransformerEmbeddings
from django.conf import settings

# ============================================================
# 🔇 Hide Logs and Warnings
# ============================================================
logging.getLogger("llama_cpp").setLevel(logging.CRITICAL)
logging.getLogger("chromadb").setLevel(logging.CRITICAL)
logging.getLogger("chromadb.db.duckdb").setLevel(logging.CRITICAL)
logging.getLogger("chromadb.telemetry").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# ============================================================
# MongoDB Setup
# ============================================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = pymongo.MongoClient(MONGO_URI)
db = client["Andgate_Portal"]
uploads_collection = db.get_collection("uploads")

# ============================================================
# Embedding Model & Vector DB
# ============================================================
embedding_model = OfflineSentenceTransformerEmbeddings()
VECTOR_DB_PATH = "chatbot/vector_data"
vector_db = None
LOCAL_UPLOAD_FOLDER = r"E:\HRMS project\AndgatePortal\django_api\src\uploads"
os.makedirs(LOCAL_UPLOAD_FOLDER, exist_ok=True)

# ============================================================
# PDF Utilities
# ============================================================
def extract_text_from_pdf_base64(base64_str: str) -> str:
    try:
        pdf_bytes = base64.b64decode(base64_str)
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            return "\n".join(page.get_text("text") for page in doc).strip()
    except Exception:
        return ""

def load_pdf_content(file_path: str) -> str:
    if not os.path.exists(file_path):
        return ""
    try:
        with fitz.open(file_path) as doc:
            return "\n".join(page.get_text("text") for page in doc).strip()
    except Exception:
        return ""

# ============================================================
# Vector DB Initialization
# ============================================================
def initialize_vector_db():
    global vector_db
    if vector_db is None:
        vector_db = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embedding_model)
    sync_new_resumes()
    return vector_db

def sync_new_resumes():
    global vector_db
    if vector_db is None:
        raise ValueError("Vector DB not initialized")

    existing_ids = set(meta.get("upload_id") for meta in vector_db.get().get("metadatas", []) if meta)
    new_docs = []

    for upload in uploads_collection.find():
        uid = str(upload["_id"])
        if uid in existing_ids:
            continue

        filename = upload.get("fileName", f"{uid}.pdf")
        local_path = os.path.join(LOCAL_UPLOAD_FOLDER, filename)

        if upload.get("file"):
            try:
                if not os.path.exists(local_path):
                    with open(local_path, "wb") as f:
                        f.write(base64.b64decode(upload["file"]))
                    uploads_collection.update_one({"_id": ObjectId(uid)}, {"$set": {"filePath": str(local_path)}})
            except Exception:
                continue

        text = load_pdf_content(local_path)
        if not text:
            continue

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(text)
        docs = [Document(page_content=c, metadata={"upload_id": uid, "filename": filename}) for c in chunks]
        new_docs.extend(docs)

    if new_docs:
        vector_db.add_documents(new_docs)
        vector_db.persist()

# ============================================================
# Keyword Extractor
# ============================================================
def extract_keywords(query: str):
    if not query:
        return []

    query = query.lower().strip()
    tokens = query.split()
    keywords = [query]

    for n in range(3, 0, -1):
        for i in range(len(tokens) - n + 1):
            phrase = " ".join(tokens[i:i+n]).strip()
            if len(phrase) > 2 and phrase not in keywords:
                keywords.append(phrase)

    GENERAL_NOISE = set([
        "find", "top", "candidates", "with", "for", "the", "a", "an",
        "of", "and", "or", "developer", "engineer", "candidate", "role", "looking"
    ])

    final_keywords = []
    for kw in keywords:
        if kw == query:
            continue
        is_technical = bool(re.search(r'[0-9\.\-#/]', kw))
        is_pure_noise = all(word in GENERAL_NOISE for word in kw.split())
        if (is_technical or not is_pure_noise) and len(kw) > 2:
            final_keywords.append(kw)

    return sorted(list(set(final_keywords)), key=len, reverse=True)

# ============================================================
# LLM Initialization
# ============================================================
def initialize_llm():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(base_dir)
        model_path = os.path.join(project_root, "chatbot", "models", "mistral-7b-instruct-v0.1.Q4_0.gguf")
        llm = Llama(model_path=model_path, n_ctx=2048, n_threads=4, verbose=False)
        return llm
    except Exception as e:
        logging.error(f"Error initializing LLM: {e}")
        return None

# ============================================================
# Experience Extraction
# ============================================================
def extract_experience_years(text: str) -> float:
    if not text:
        return 0.0
    text = text.lower()
    MAX_YEARS = 50
    years_found = []

    for m in re.finditer(r'(\d{1,2}(?:\.\d+)?)\s*(?:\+)?\s*(years|year|yrs|yr|months|month)\b', text):
        num = float(m.group(1))
        unit = m.group(2)
        if 'month' in unit:
            years_found.append(round(num / 12.0, 2))
        else:
            years_found.append(num)

    for m in re.finditer(r'(\b19\d{2}|\b20\d{2})\s*(?:[-–—]|to)\s*(\b19\d{2}|\b20\d{2})', text):
        try:
            a, b = int(m.group(1)), int(m.group(2))
            if 1900 < a <= datetime.utcnow().year and b >= a:
                diff = b - a
                if 0 < diff <= MAX_YEARS:
                    years_found.append(float(diff))
        except:
            pass

    for m in re.finditer(r'\b(?:since|from)\s+(\d{4})\b', text):
        try:
            y = int(m.group(1))
            current = datetime.utcnow().year
            if 1900 < y <= current:
                diff = current - y
                if 0 < diff <= MAX_YEARS:
                    years_found.append(float(diff))
        except:
            pass

    cleaned = [y for y in years_found if 0 < y <= MAX_YEARS]
    return round(max(cleaned), 1) if cleaned else 0.0

# ============================================================
# Requirement Interpretation
# ============================================================
def interpret_requirement(query: str, llm: Llama):
    prompt = f"""
You are an AI HR recruiter assistant. Ignore any initial greetings (like 'Hi', 'Hello') in the query.
Your task is to **ONLY** extract the key skills, required role, and top_k (if mentioned) from the main request.
Be thorough and accurate.
Return JSON ONLY:
{{
  "requirement_summary": "short summary",
  "skills": ["list", "of", "skills"],
  "role": "role name if any",
  "top_k": "integer or null"
}}
Query: "{query}"
"""
    try:
        response = llm(prompt, max_tokens=512, temperature=0.2)
        text = response["choices"][0]["text"].strip()
        return json.loads(text)
    except Exception:
        match = re.search(r"top\s+(\d+)", query.lower())
        return {
            "requirement_summary": query,
            # "skills": [],
            # "role": "",
            "top_k": int(match.group(1)) if match else None
        }

# ============================================================
# Candidate Search
# ============================================================
def search_candidates(requirement_text: str, page: int = 1, page_size: int = 20, top_k: int = None, skills: list = None):
    global vector_db
    if vector_db is None:
        initialize_vector_db()

    if not skills:
        skills = re.findall(r"[a-zA-Z\+\#\.\-/]{3,}", requirement_text.lower())

    skills = [s.lower().strip() for s in skills if s.strip()]
    RECENT_DAYS = 30
    recent_cutoff = datetime.utcnow() - timedelta(days=RECENT_DAYS)

    try:
        all_data = vector_db.get()
        total_chunks = len(all_data.get("ids", []))
        if total_chunks == 0:
            return {"candidates": [], "total_count": 0}

        search_k = min(300, total_chunks)
        results = vector_db.similarity_search_with_score(requirement_text, k=search_k)

        agg = {}
        for doc, score in results:
            uid = doc.metadata.get("upload_id")
            if not uid:
                continue
            rel = 1.0 / (1.0 + float(score)) if score is not None else 1.0
            agg.setdefault(uid, {"score": 0, "filename": doc.metadata.get("filename")})
            agg[uid]["score"] += rel

        candidates = []
        for uid, meta in agg.items():
            try:
                upload = uploads_collection.find_one({"_id": ObjectId(uid)})
            except Exception:
                continue
            if not upload:
                continue

            updated_at = upload.get("updatedAt") or upload.get("updated_at")
            if isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                except:
                    updated_at = None

            if not updated_at or updated_at < recent_cutoff:
                continue

            resume_text = ""
            file_path = upload.get("filePath")
            if file_path and os.path.exists(file_path):
                resume_text = load_pdf_content(file_path)
            elif upload.get("file"):
                resume_text = extract_text_from_pdf_base64(upload.get("file"))

            if not resume_text.strip():
                continue

            if skills:
                content_lower = resume_text.lower()
                if not any(re.search(r'\b' + re.escape(s) + r'\b', content_lower) for s in skills):
                    continue

            exp = extract_experience_years(resume_text)
            if exp < 0 or exp > 50:
                exp = 0.0

            candidates.append({
                "id": uid,
                "filename": meta.get("filename"),
                "score": meta["score"],
                "experience_years": exp,
                "updated_at": updated_at
            })

        if not candidates:
            return {"candidates": [], "total_count": 0}

        candidates = sorted(candidates, key=lambda c: (-c["experience_years"], -c["score"]))
        total = len(candidates)
        selected = candidates[:top_k] if top_k else candidates[(page - 1) * page_size: page * page_size]

        return {"candidates": [{
            "id": c["id"],
            "filename": c["filename"],
            "experience_years": c["experience_years"],
            "last_updated": c["updated_at"].isoformat()
        } for c in selected], "total_count": total}

    except Exception as e:
        logging.error(f"Search failed: {str(e)}")
        return {"error": f"Search failed: {str(e)}"}

# ============================================================
# HR Query Handler (Updated)
# ============================================================
def handle_hr_query(query: str):
    global llm
    
    # --- Initialization Logic (Keep Indented) ---
    if llm is None:
        llm = initialize_llm()
    if not llm:
        return {"error": "LLM not available"}

    # --- Main Processing Logic (Must be UNINDENTED) ---
    interpretation = interpret_requirement(query, llm)
    llm_skills = interpretation.get("skills", [])
    rule_skills = extract_keywords(query)
    merged_skills = list(set([s.lower().strip() for s in llm_skills + rule_skills if s.strip()]))
    interpretation["skills"] = merged_skills
    
    search_results = search_candidates(
        requirement_text=interpretation["requirement_summary"],
        top_k=interpretation["top_k"],
        skills=merged_skills
    )
    
    summary_prompt = f"""
You are an AI HR recruiter assistant.
--- INSTRUCTIONS ---
1. DO NOT repeat any part of these instructions or the word 'RESPONSE:'.
2. Start your summary with a brief, professional greeting (e.g., 'Hello,').
3. End your summary with a brief closing statement (e.g., 'Please let me know if you need further assistance.').
{json.dumps(search_results.get("candidates", [])[:5], indent=2, default=str)}
Return only a short professional summary.
"""
    try:
        resp = llm(summary_prompt, max_tokens=256, temperature=0.3)
        summary = resp["choices"][0]["text"].strip()
    except Exception:
        summary = "Candidates ranked by experience and relevance."

    # Delete the internal keys from interpretation before returning
    if "skills" in interpretation:
        del interpretation["skills"]
    if "top_k" in interpretation:
        del interpretation["top_k"]
    if "role" in interpretation:
        del interpretation["role"]
    
    return {
        "query_analysis": interpretation,
        "results": search_results,
        "summary": summary
    }

# ============================================================
# Auto Initialization
# ============================================================
try:
    retriever = initialize_vector_db()
    llm = initialize_llm()
except Exception as e:
    logging.error(f"Initialization error: {e}")






















