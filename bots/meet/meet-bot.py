import asyncio
import os
import sys

from meet_auth import get_credentials, get_meet_service
from meet_audio import AudioStreamHandler

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))


class MeetBot:
    def __init__(self, meeting_uri: str, meeting_id: str, user_email: str):
        self.meeting_uri = meeting_uri
        self.meeting_id = meeting_id
        self.user_email = user_email
        self.is_active = False

    async def join(self):
        creds = get_credentials(self.user_email)
        meet_service = get_meet_service(self.user_email)

        # Extract space code from URL (e.g. abc-defg-hij)
        space_code = self.meeting_uri.split('/')[-1]

        conference = meet_service.conferenceRecords().list(
            filter=f'space.name=spaces/{space_code}'
        ).execute()

        print(f'[MeetBot] Joining: {self.meeting_uri}')
        self.is_active = True

        self.audio_handler = AudioStreamHandler()
        await self.audio_handler.connect(
            conference_id=conference['conferenceRecords'][0]['name'],
            credentials=creds,
            on_audio_chunk=self.handle_audio_chunk,
            on_meeting_end=self.handle_meeting_end
        )

    async def handle_audio_chunk(self, pcm_data: bytes, speaker_id: str):
        # Audio processing is handled by the Node.js shared modules
        # This method receives raw audio and forwards it via IPC
        pass

    async def speak(self, text: str):
        # TTS audio injection handled via shared tts-engine
        print(f'[MeetBot] Agent spoke: {text}')

    async def handle_meeting_end(self):
        print(f'[MeetBot] Meeting ended: {self.meeting_id}')
        self.is_active = False


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--meeting-uri', required=True)
    parser.add_argument('--meeting-id', required=True)
    parser.add_argument('--user-email', required=True)
    args = parser.parse_args()

    bot = MeetBot(args.meeting_uri, args.meeting_id, args.user_email)
    asyncio.run(bot.join())
