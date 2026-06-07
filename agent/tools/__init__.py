from .calendar_tool import create_check_availability_tool, create_book_appointment_tool
from .knowledge_tool import search_knowledge_base
from .data_collection import create_save_caller_data_tool

def get_all_tools(lifecycle_manager):
    """
    Combines all available agent tools into a single list.
    Passes the lifecycle manager to tools that require database access.
    """
    return [
        create_check_availability_tool(),
        create_book_appointment_tool(lifecycle_manager),
        create_save_caller_data_tool(lifecycle_manager),
        search_knowledge_base,
    ]
