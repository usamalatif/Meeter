import asyncio
import os

from google.apps.meet.v2 import SpacesServiceClient
from google.apps.meet.v2.types import ConnectActiveConferenceRequest


class AudioStreamHandler:
    def __init__(self):
        self.client = None
        self.session = None
        self.is_connected = False

    async def connect(self, conference_id, credentials, on_audio_chunk, on_meeting_end):
        self.on_audio_chunk = on_audio_chunk
        self.on_meeting_end = on_meeting_end
        self.client = SpacesServiceClient(credentials=credentials)

        request = ConnectActiveConferenceRequest(
            name=conference_id,
            bot_participant={
                'display_name': os.environ.get('BOT_DISPLAY_NAME', 'Aria (AI Assistant)')
            }
        )

        self.session = self.client.connect_active_conference(request)
        self.is_connected = True
        await self._receive_loop()

    async def _receive_loop(self):
        async for response in self.session:
            if hasattr(response, 'audio'):
                await self.on_audio_chunk(
                    response.audio.raw_audio,
                    response.audio.participant_id
                )
            elif hasattr(response, 'conference_ended'):
                await self.on_meeting_end()
                break

    async def inject_audio(self, audio_bytes: bytes):
        if self.session and self.is_connected:
            await self.session.send_audio(audio_bytes)

    async def disconnect(self):
        if self.session:
            await self.session.close()
        self.is_connected = False
