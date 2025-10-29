# views.py

# chatbot/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from hrmatch.utils import *

class CandidateSearchAPIView(APIView):
    """
    Single API to handle HR queries and return matching candidates with summary.
    """

    def post(self, request):
        try:
            # Get query from request
            hr_query = request.data.get("query", "").strip()
            prev_requirement = request.data.get("prev_requirement", "")
            prev_page = int(request.data.get("prev_page", 1))
            prev_page_size = int(request.data.get("prev_page_size", 20))

            if not hr_query:
                return Response(
                    {"error": "Query text is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Step 1: Parse the intent using LLM
            intent = parse_requirement_with_llm(
                hr_query, prev_requirement, prev_page, prev_page_size
            )

            # Step 2: Search candidates in Chroma
            result = search_candidates(
                requirement_text=intent["requirement"],
                page=intent["page"],
                page_size=intent["page_size"],
                top_k=intent.get("top_k")
            )

            if "error" in result:
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # ✅ Step 3: Return clean response
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )