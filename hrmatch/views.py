from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import re

from .utils import *


class RequirementSearchAPIView(APIView):

    def get_greeting(self):
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return "Good morning"
        elif 12 <= hour < 17:
            return "Good afternoon"
        return "Good evening"

    def extract_top_k(self, query_text):
        match = re.search(r'(\d+)', query_text)
        return int(match.group(1)) if match else 3
    

    def post(self, request):
        query_text = request.data.get("query_text", "").lower()

        if not query_text:
            return Response({"error": "query_text is required"}, status=400)

        # ✅ 1. Check greeting (semantic, no regex)
        if is_greeting(query_text):
            hr_name = request.user.first_name if hasattr(request.user, "first_name") else "there"
            return Response({
                "summary": f"Hello {hr_name}! How can I help you find the best talent today?"
            })

        # ✅ 2. Check if user asked for "next"
        if "next" in query_text and session_memory["session_id"]:
            count = self.extract_top_k(query_text)
            result = hr_next(count)

            if isinstance(result, str):
                return Response({
                    "summary": result,
                    "candidates": []
                })

            return Response({
                "results": len(result["candidates"]),
                "candidates": result["candidates"],
                "summary": result["summary"]
            })

        # ✅ 3. Fresh search (normal search flow)
        top_k = self.extract_top_k(query_text)
        result = hr_search(query_text, top_k)

        if isinstance(result, str):
            return Response({
                "summary": f"{self.get_greeting()}! {result}"
            })

        return Response({
            "session_id": result["session_id"],
            "results": len(result["candidates"]),
            "candidates": result["candidates"],
            "summary": result["summary"]
        })
