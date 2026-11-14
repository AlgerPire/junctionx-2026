from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.deps import PersonaContext, resolve_persona
from app.services.stt import STTError, transcribe_audio
from app.services.tts import TTSError, synthesize_speech

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    lang: str | None = Form(default=None),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    """Audio is read into memory only and discarded after STT."""
    _ = persona
    data = await audio.read()
    try:
        text = await transcribe_audio(
            data,
            content_type=audio.content_type or "audio/wav",
            filename=audio.filename or "audio.wav",
            lang=lang,
        )
        return {"text": text}
    except STTError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"STT failed — please type instead. ({exc})",
        ) from exc


class TtsBody(BaseModel):
    text: str
    lang: str = "en-GB"


@router.post("/tts")
async def tts(body: TtsBody, persona: PersonaContext = Depends(resolve_persona)) -> Response:
    _ = persona
    try:
        audio = await synthesize_speech(body.text, body.lang)
        return Response(content=audio, media_type="audio/mpeg")
    except TTSError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
