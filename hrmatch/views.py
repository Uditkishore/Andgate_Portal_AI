from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from hrmatch.utils import * 

class HRSearchAPIView(APIView):
    """
    POST API:
    Takes recruiter query and returns intelligent candidate search results
    with dynamic skill extraction, ranking, and summary.
    """

    def post(self, request):
        try:
            query = request.data.get("query", "").strip()
            if not query:
                return Response(
                    {"error": "Missing 'query' field."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Call the main AI handler
            result = handle_hr_query(query)

            if "error" in result:
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Something went wrong: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
