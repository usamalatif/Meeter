from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

SCOPES = [
    'https://www.googleapis.com/auth/meetings.space.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.send',
]


def get_credentials(user_email: str):
    """Get delegated credentials for a specific user"""
    credentials = service_account.Credentials.from_service_account_file(
        os.environ['GOOGLE_SERVICE_ACCOUNT_PATH'],
        scopes=SCOPES
    )
    # Impersonate the user so bot can join their meetings
    return credentials.with_subject(user_email)


def get_meet_service(user_email: str):
    creds = get_credentials(user_email)
    return build('meet', 'v2', credentials=creds)
