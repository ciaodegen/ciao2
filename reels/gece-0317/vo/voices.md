# Gece 03:17 — Voiceover voices

Model: `eleven_v3`, `language_code: "tr"`, voice_settings `{"stability": 0.5}`, output `mp3_44100_128`,
endpoint `POST /v1/text-to-speech/{voice_id}/with-timestamps`. Every `NN.json` holds the exact text sent (audio tags included),
the character `alignment`, voice, model and settings.

| Role | Voice | voice_id | Gender / age | Accent | Why |
|---|---|---|---|---|---|
| NARRATOR (01, 02, 05–08) | Hakan - Calm & Friendly | `UZfpTmsEg4kOu9LAEgHd` | male, middle-aged | Istanbul | Native Turkish, conversational podcast style ("like a friend telling you about something"), so it sounds like a business owner telling a story, not an announcer. |
| CUSTOMER (03) | Meta Ecem | `PVbzZmwmdI99VcmuRK7G` | female, young | Istanbul | Casual, conversational everyday voice; clearly different from the assistant. |
| ASSISTANT (04) | Buket – Calm Storytelling Voice (library name "Fili - Warm Turkish Female") | `FDs1ZX5J4e4f2c2erxtW` | female, young | Istanbul | Warm, calm, natural; one of the most-used Turkish voices in the library (~16k adds), fits a professional receptionist. |

All three were already in the account's voice list (Voice Library voices), so nothing had to be added.

## ELEVENLABS_VOICE_ID
It is **Emrullah Uzun - Storyteller** (`DpEiQMnL9WxMsymCsjPY`): male, middle-aged, Istanbul, calm, narrative_story, "baritone – warm, full, smooth resonance".
It was not used: it is a deep audiobook/storyteller baritone, closer to an announcer than to a business owner chatting, so Hakan fits the narrator brief better.
To swap the narrator, change `NARRATOR` in the generation script and regenerate 01, 02, 05–08.

## Audio tags used (eleven_v3)
01–02 `[whispers]`, 03 `[in pain]`, 04 `[warmly]`, 05 `[amazed]`, 06 none, 07 `[confident]`, 08 `[friendly]`. The spoken words are exactly as in the script.

## Characters
Text sent: 453 characters (including tags) for the 8 final lines, plus ~58 more for the regenerated line 08 and an 8-character API test.
