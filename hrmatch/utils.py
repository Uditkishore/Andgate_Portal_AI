import os
import pymongo
import base64
import fitz  # PyMuPDF for PDF parsing
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from chatbot.offline_loader import OfflineSentenceTransformerEmbeddings
from llama_cpp import Llama
import re
import json
from bson import ObjectId
from django.conf import settings
from pathlib import Path
from datetime import datetime, timedelta


# --- MongoDB setup ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = pymongo.MongoClient(MONGO_URI)
db = client["Andgate_Portal"]
uploads_collection = db.get_collection("uploads")

# --- Embeddings & Vector DB ---
embedding_model = OfflineSentenceTransformerEmbeddings()
VECTOR_DB_PATH = "chatbot/vector_data"

vector_db = None

# --- Local uploads folder (where decoded PDFs will be saved) ---
LOCAL_UPLOAD_FOLDER = r"E:\HRMS project\AndgatePortal\django_api\src\uploads"
os.makedirs(LOCAL_UPLOAD_FOLDER, exist_ok=True)

# --- Initialize Chroma vector DB ---
def initialize_vector_db():
    """
    Initialize Chroma vector DB and sync any new resumes from Mongo.
    """
    global vector_db
    if vector_db is None:
        vector_db = Chroma(
            persist_directory=VECTOR_DB_PATH,
            embedding_function=embedding_model
        )
    sync_new_resumes()  # Always check for new records
    return vector_db


# --- Helper: Extract text from base64 PDF ---
def extract_text_from_pdf_base64(base64_str: str) -> str:
    try:
        pdf_bytes = base64.b64decode(base64_str)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "\n".join(page.get_text("text") for page in doc)
        return text.strip()
    except Exception as e:
        print(f"⚠️ PDF decode failed: {e}")
        return ""


# --- Helper: Load text from file path ---
def load_pdf_content(file_path: str) -> str:
    """
    Load and extract text from a PDF file.
    """
    if not os.path.exists(file_path):
        # don't flood logs for each chunk — only high-level caller prints if needed
        return ""
    try:
        with fitz.open(file_path) as doc:
            return "\n".join(page.get_text("text") for page in doc).strip()
    except Exception as e:
        print(f"⚠️ Error reading {file_path}: {e}")
        return ""


# --- Keyword extractor for queries ---
_STOPWORDS = {
    "find", "finds", "top", "show", "showing", "show me", "list", "get",
    "return", "candidates", "candidate", "resume", "resumes", "page", "out",
    "of", "the", "a", "an", "for", "with", "and", "or", "in", "on", "by",
    "role", "position", "need", "looking", "seeking", "hire", "hiring",
    "please", "these", "that", "is", "are", "i", "me", "my"
}


def extract_keywords(q: str):
    """
    Lightweight keyword extractor:
    - normalizes c++ / c#
    - splits on non-word characters
    - removes stopwords and pure-numbers
    - returns ordered unique keywords (lowercase)
    """
    if not q:
        return []
    q = q.lower()
    q = q.replace("c++", "cpp").replace("c#", "csharp")
    # remove punctuation except plus/hash already normalized
    tokens = re.findall(r"\b[\w\+\#\-\.]+\b", q)
    out = []
    seen = set()
    for t in tokens:
        if t.isdigit():
            continue
        if t in _STOPWORDS:
            continue
        if len(t) <= 1:
            continue
        # skip common role words
        if t in {"developer", "developers", "engineer", "engineers", "dev", "position", "role"}:
            continue
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


# --- Sync new resumes ---
def sync_new_resumes():
    """
    Sync MongoDB resumes from 'uploads' collection into Chroma.
    - Decodes base64 PDFs into local folder
    - Extracts text and updates Mongo with absolute filePath
    - Adds chunks to Chroma
    """
    global vector_db
    if vector_db is None:
        raise ValueError("Vector DB not initialized")

    # collect already indexed upload ids (if present in metadatas)
    existing_ids = set()
    all_data = vector_db.get()
    if "metadatas" in all_data:
        for meta in all_data["metadatas"]:
            if meta and "upload_id" in meta:
                existing_ids.add(meta["upload_id"])

    new_docs = []
    for upload in uploads_collection.find():
        uid = str(upload["_id"])
        if uid in existing_ids:
            # already indexed
            continue

        resume_text = ""
        filename = upload.get("fileName", f"{uid}.pdf")
        local_path = os.path.join(LOCAL_UPLOAD_FOLDER, filename)

        # Prefer base64 'file' field (you said every doc has base64)
        if upload.get("file"):
            try:
                # write only if missing (safe)
                if not os.path.exists(local_path):
                    with open(local_path, "wb") as f:
                        f.write(base64.b64decode(upload["file"]))
                    print(f"✅ Saved PDF to: {local_path}")

                    # update Mongo filePath to absolute path for future use
                    try:
                        uploads_collection.update_one(
                            {"_id": ObjectId(uid)},
                            {"$set": {"filePath": str(local_path)}}
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to update Mongo filePath for {uid}: {e}")

                resume_text = load_pdf_content(local_path)
            except Exception as e:
                print(f"⚠️ Error handling base64 for {uid}: {e}")
                continue

        # fallback if no base64 but filePath exists
        elif upload.get("filePath"):
            raw_path = upload["filePath"]
            normalized = Path(raw_path.replace("/", os.sep).replace("\\", os.sep))
            if normalized.is_absolute():
                absolute_path = normalized
            else:
                absolute_path = Path(settings.BASE_DIR) / normalized
            if absolute_path.exists():
                resume_text = load_pdf_content(str(absolute_path))
            else:
                print(f"❌ File missing for DB record {uid}: {absolute_path}")
                continue

        # if still empty, skip
        if not resume_text or not resume_text.strip():
            continue

        # chunk and add
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(resume_text)
        docs = [
            Document(
                page_content=chunk,
                metadata={
                    "upload_id": uid,
                    "filename": filename,
                },
            )
            for chunk in chunks
        ]
        new_docs.extend(docs)

    if new_docs:
        vector_db.add_documents(new_docs)
        vector_db.persist()
        print(f"✅ Indexed {len(new_docs)} new document chunks.")

def extract_experience_years(text: str) -> float:
    """
    Estimate years of experience from free text using a hybrid filter approach.
    - Detects numeric patterns like "5 years of experience" or "6 months exp"
    - Detects phrases like "since 2016" and computes years dynamically
    - Returns float (e.g., 7.5, 3.0, etc.)
    """
    if not text:
        return 0.0

    text = text.lower()
    tokens = re.findall(r'\b[\w\.]+\b', text)
    years_found = []

    # --- 1️⃣ Token proximity check around 'experience' or 'exp'
    for i, tok in enumerate(tokens):
        if tok.startswith(('exp', 'experience')):
            window = tokens[max(0, i - 6):i + 6]
            for j, w in enumerate(window):
                # detect numbers like 5, 5+, 5.5
                if w.replace('.', '', 1).isdigit():
                    num = float(w.replace('+', ''))
                    next_tokens = window[j + 1:j + 3]
                    if any(x in next_tokens for x in ["year", "years", "yr", "yrs"]):
                        years_found.append(num)
                    elif any(x in next_tokens for x in ["month", "months"]):
                        years_found.append(round(num / 12, 2))

    # --- 2️⃣ "Over X years" or "Having X years" even without "experience"
    for i, tok in enumerate(tokens):
        if tok in {"over", "around", "about", "having"}:
            window = tokens[i:i + 5]
            for j, w in enumerate(window):
                if w.replace('.', '', 1).isdigit():
                    num = float(w.replace('+', ''))
                    if any(x in window[j + 1:j + 3] for x in ["year", "years", "yr", "yrs"]):
                        years_found.append(num)

    # --- 3️⃣ Handle "since 2016" or "from 2018" style dates
    current_year = datetime.utcnow().year
    for i, tok in enumerate(tokens):
        if tok in {"since", "from"} and i + 1 < len(tokens):
            nxt = tokens[i + 1]
            if nxt.isdigit() and len(nxt) == 4:
                year_val = int(nxt)
                if 1970 < year_val <= current_year:
                    years_found.append(current_year - year_val)

    # --- Pick the most plausible experience value
    if years_found:
        plausible_years = [y for y in years_found if 0 < y <= 50]
        if plausible_years:
            return round(max(plausible_years), 1)

    return 0.0

def search_candidates(requirement_text: str, page: int = 1, page_size: int = 20, top_k: int = None):
    global vector_db
    if vector_db is None:
        initialize_vector_db()

    keywords = extract_keywords(requirement_text)
    if top_k is None:
        m = re.search(r"\btop\s+(\d+)\b", requirement_text.lower())
        if m:
            try:
                top_k = int(m.group(1))
            except:
                top_k = None

    try:
        all_data = vector_db.get()
        total_chunks = len(all_data.get("ids", []))
        if total_chunks == 0:
            return {"candidates": [], "total_count": 0}

        search_k = min(200, total_chunks)
        results = vector_db.similarity_search_with_score(requirement_text, k=search_k)

        candidate_map = {}
        for doc, score in results:
            uid = doc.metadata.get("upload_id")
            if not uid:
                continue

            content = (doc.page_content or "").lower()
            if keywords:
                if not any(kw in content for kw in keywords):
                    continue

            try:
                relevance = 1.0 / (1.0 + float(score))
            except Exception:
                relevance = 1.0

            if uid not in candidate_map:
                candidate_map[uid] = {
                    "id": uid,
                    "filename": doc.metadata.get("filename") or f"resume_{uid}.pdf",
                    "score": relevance,
                    "chunks": 1
                }
            else:
                candidate_map[uid]["score"] += relevance
                candidate_map[uid]["chunks"] += 1

        if not candidate_map:
            return {"candidates": [], "total_count": 0}
        

        # ✅ New: Filter by recency (last 30 days) and dynamically extract experience
        recent_cutoff = datetime.utcnow() - timedelta(days=30)
        valid_candidates = []

        for uid, data in candidate_map.items():
            upload = uploads_collection.find_one({"_id": ObjectId(uid)}, {"updatedAt": 1, "file": 1, "filePath": 1})
            if not upload:
                continue

            # --- 1️⃣ Check recency ---
            updated_at = upload.get("updatedAt")
            if isinstance(updated_at, dict) and "$date" in updated_at:
                updated_at = datetime.fromisoformat(upload["updatedAt"]["$date"].replace("Z", "+00:00"))
            elif isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                except:
                    updated_at = None

            if not updated_at or updated_at < recent_cutoff:
                continue  # skip resumes older than 30 days

            # --- 2️⃣ Extract text (from local or base64) ---
            resume_text = ""
            file_path = upload.get("filePath")

            if file_path and os.path.exists(file_path):
                resume_text = load_pdf_content(file_path)
            elif upload.get("file"):  # fallback: base64
                resume_text = extract_text_from_pdf_base64(upload["file"])

            if not resume_text.strip():
                continue

            # --- 3️⃣ Dynamically extract experience (no DB save) ---
            experience = extract_experience_years(resume_text)
            data["experience_years"] = experience
            data["updated_at"] = updated_at
            valid_candidates.append(data)


        if not valid_candidates:
            return {"candidates": [], "total_count": 0, "message": "No recently updated resumes found"}

        # ✅ New: Sort primarily by experience, then by relevance
        sorted_candidates = sorted(
            valid_candidates,
            key=lambda x: (x.get("experience_years", 0), x.get("score", 0)),
            reverse=True
        )

        # Apply top_k or pagination
        if top_k:
            selected = sorted_candidates[:top_k]
        else:
            start = (page - 1) * page_size
            end = start + page_size
            selected = sorted_candidates[start:end]

        response_candidates = [
            {
                "id": c["id"],
                "filename": c["filename"],
                "experience_years": c.get("experience_years", 0),
                "last_updated": c.get("updated_at").strftime("%Y-%m-%d") if c.get("updated_at") else None
            }
            for c in selected
        ]

        return {"candidates": response_candidates, "total_count": len(valid_candidates)}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Search failed: {str(e)}"}


# --- LLaMA model (used only for parse if needed) ---
def initialize_llm():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))  # hrmatch/
        project_root = os.path.dirname(base_dir)  # django_api/
        model_path = os.path.join(project_root, "chatbot", "models", "mistral-7b-instruct-v0.1.Q4_0.gguf")

        return Llama(
            model_path=model_path,
            n_ctx=32768,
            n_threads=4,
            use_mlock=True,
            verbose=False
        )
    except Exception as e:
        print(f"❌ Error initializing LLM: {str(e)}")
        return None


# --- Initialize on import ---
try:
    retriever = initialize_vector_db()
    llm = initialize_llm()
except Exception as e:
    print(f"❌ Initialization error: {str(e)}")
    retriever = None
    llm = None


# --- Intent parser (deterministic) ---
def parse_requirement_with_llm(hr_query: str, prev_requirement: str, prev_page: int, prev_page_size: int):
    prompt = f"""
You are an AI HR query interpreter.

Your job is to extract search intent from HR queries for candidate matching.

When analyzing the query:
1. Detect if the query is a NEW requirement or CONTINUATION.
2. Extract skills or technologies (e.g., python, java, verilog, uvm).
3. Identify the role or domain (e.g., software developer, VLSI engineer).
4. Detect requested top_k if mentioned (like "top 15" or "top 10").
5. Keep pagination consistent if "next" or "more" is mentioned.

Return JSON ONLY in this format:
{{
  "mode": "new" | "continue",
  "requirement": "...",
  "page": int,
  "page_size": int,
  "top_k": int | null,
  "skills": [list of skills or keywords],
  "role": "string describing job role"
}}

Examples:
Input: "Find top 10 VLSI verification engineers with UVM skills"
Output:
{{
  "mode": "new",
  "requirement": "Find top 10 VLSI verification engineers with UVM skills",
  "page": 1,
  "page_size": 20,
  "top_k": 10,
  "skills": ["VLSI", "UVM"],
  "role": "verification engineer"
}}

Input: "Next 20 candidates"
Output:
{{
  "mode": "continue",
  "requirement": "previous requirement",
  "page": 2,
  "page_size": 20,
  "top_k": null,
  "skills": [],
  "role": ""
}}

Now analyze:
HR Query: "{hr_query}"
Previous Requirement: "{prev_requirement}"
Previous Page: {prev_page}
Previous Page Size: {prev_page_size}

Return JSON ONLY in this format:
{{
  "mode": "new" | "continue",
  "requirement": "...",
  "page": int,
  "page_size": int,
  "top_k": int | null
}}
"""
    if llm is None:
        # fallback simple parser (no LLM)
        match = re.search(r"top\s+(\d+)", hr_query.lower())
        top_k = int(match.group(1)) if match else None
        if "next" in hr_query.lower() or "more" in hr_query.lower():
            return {"mode": "continue", "requirement": prev_requirement, "page": prev_page + 1, "page_size": prev_page_size, "top_k": top_k}
        return {"mode": "new", "requirement": hr_query, "page": 1, "page_size": 20, "top_k": top_k}

    response = llm(prompt, max_tokens=256, temperature=0.0, stop=["</s>"])
    text = response["choices"][0]["text"].strip()
    try:
        return json.loads(text)
    except:
        # fallback same as above
        match = re.search(r"top\s+(\d+)", hr_query.lower())
        top_k = int(match.group(1)) if match else None
        if "next" in hr_query.lower() or "more" in hr_query.lower():
            return {"mode": "continue", "requirement": prev_requirement, "page": prev_page + 1, "page_size": prev_page_size, "top_k": top_k}
        return {"mode": "new", "requirement": hr_query, "page": 1, "page_size": 20, "top_k": top_k}
    


