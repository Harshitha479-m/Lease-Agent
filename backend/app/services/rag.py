from pathlib import Path

from ..config import get_settings


class LeaseRag:
    def __init__(self) -> None:
        self.collection = None
        try:
            import chromadb

            client = chromadb.PersistentClient(path=get_settings().chroma_persist_dir)
            self.collection = client.get_or_create_collection("lease_documents")
        except (ImportError, Exception):
            self.collection = None

    def add_document(self, lease_id: int, text: str) -> None:
        if self.collection and text:
            self.collection.upsert(ids=[str(lease_id)], documents=[text], metadatas=[{"lease_id": lease_id}])

    def answer(self, lease_id: int, question: str, fallback_text: str | None) -> tuple[str, list[str]]:
        context = fallback_text or ""
        sources = ["Uploaded lease document"] if context else []
        if self.collection:
            result = self.collection.query(query_texts=[question], n_results=3, where={"lease_id": lease_id})
            documents = result.get("documents", [[]])[0]
            if documents:
                context = "\n\n".join(documents)
                sources = [f"Lease document excerpt {index + 1}" for index in range(len(documents))]
        if not context:
            return "I could not find supporting text in this lease document.", []

        settings = get_settings()
        if settings.openai_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=settings.openai_api_key)
                response = client.chat.completions.create(
                    model=settings.openai_model,
                    temperature=0,
                    messages=[
                        {"role": "system", "content": "Answer only from the provided lease context. If the answer is absent, say you could not find it in the document. Do not infer or invent facts."},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
                    ],
                )
                return response.choices[0].message.content or "I could not find supporting text in this lease document.", sources
            except Exception:
                pass

        # Credential-free fallback returns an honest excerpt for local development.
        question_terms = [term.lower() for term in question.split() if len(term) > 3]
        lines = [line.strip() for line in context.splitlines() if line.strip()]
        matches = [line for line in lines if any(term in line.lower() for term in question_terms)]
        if matches:
            return "Relevant text found in the uploaded document:\n\n" + "\n".join(matches[:4]), sources
        return "I could not find a directly supporting answer in this lease document.", sources


rag = LeaseRag()
