# Gece 03:17 — Voiceover (v2, expressive takes)

Model `eleven_v3`, `language_code: "tr"`, output `mp3_44100_128`, endpoint `/v1/text-to-speech/{voice_id}/with-timestamps`.
Per line: 3 takes (takes 1–2 at stability 0.0 "Creative", take 3 at 0.5). Line 08 got 3 extra takes (4–6) with more ellipses for pacing, because takes 1–3 were rushed (0.054 s/char).
All takes are in `takes/NN_k.mp3` + `takes/NN_k.json` (text, settings, metrics, alignment). The chosen take is copied to `NN.mp3` / `NN.json`.

## Voices (unchanged)
| Role | Voice | voice_id |
|---|---|---|
| NARRATOR | Hakan - Calm & Friendly (male, middle-aged, Istanbul, conversational) | `UZfpTmsEg4kOu9LAEgHd` |
| CUSTOMER | Meta Ecem (female, young, Istanbul, casual) | `PVbzZmwmdI99VcmuRK7G` |
| ASSISTANT | Buket – Calm Storytelling Voice (female, young, Istanbul, warm/calm) | `FDs1ZX5J4e4f2c2erxtW` |

`ELEVENLABS_VOICE_ID` = Emrullah Uzun - Storyteller (`DpEiQMnL9WxMsymCsjPY`), a deep audiobook baritone; not used.

## Brand pronunciation
Line 07 is spoken from the text "Mimoza ey-ay". In the chosen take, "Mimoza" runs 0.68–1.36 s and "ey-ay" runs 1.47–1.92 s as a separate word.

## Selection method
- **Transcript check: NOT done with STT.** The API key lacks the `speech_to_text` permission. Local ASR (Whisper) could not download its model because Hugging Face and the OpenAI model hosts are blocked by the network. The `transcript` field in the JSONs is therefore `null`.
- What I checked instead:
  1. The TTS alignment characters reproduce the sent text exactly.
  2. Audio tags are not spoken: there is less than 0.2 s of sound above the energy threshold inside each tag's aligned span.
  3. Pace is between 0.05 and 0.11 s per spoken character.
- Score = F0 range in semitones (librosa.pyin, 10th–90th percentile) + 0.5 × the number of pauses ≥150 ms, capped at the number of punctuation breaks. The highest-scoring valid take wins.

## Chosen takes
| Line | Role | Take | Stability | Text sent | Pitch range (st) | Duration (s) | s/char | Pauses | Chars |
|---|---|---|---|---|---|---|---|---|---|
| 01 | NARRATOR | 2 of 3 | 0.0 | [whispers] [nervous] Gece üç on yedi… İş yerimde… kimse yoktu. | 8.6 | 3.84 | 0.0937 | 2 | 62 |
| 02 | NARRATOR | 1 of 3 | 0.0 | [whispers] [scared] …ama biri… telefonu açtı. | 7.0 | 2.56 | 0.1024 | 1 | 45 |
| 03 | CUSTOMER | 1 of 3 | 0.0 | [in pain] [anxious] Dişim çok ağrıyor… sabah yer var mı? | 7.78 | 2.32 | 0.0644 | 1 | 56 |
| 04 | ASSISTANT | 2 of 3 | 0.0 | [warmly] Geçmiş olsun! Sabah dokuz buçuğa ayırdım. | 22.26 | 3.6 | 0.0878 | 1 | 50 |
| 05 | NARRATOR | 3 of 3 | 0.5 | [amazed] Ben uyurken… dört müşteri aradı. [relieved] Tek bir arama bile kaçmadı! | 8.95 | 4.96 | 0.0827 | 3 | 80 |
| 06 | NARRATOR | 1 of 3 | 0.0 | [emphatic] Maaş istemiyor. Sigorta istemiyor. İzin istemiyor. Ve asla… uyumuyor. | 12.28 | 6.48 | 0.0939 | 3 | 80 |
| 07 | NARRATOR | 3 of 3 | 0.5 | [confident] [warmly] Tanışın: Mimoza ey-ay. Sen uyurken bile, işletmen için çalışan biri. | 13.9 | 5.44 | 0.08 | 2 | 89 |
| 08 | NARRATOR | 6 of 6 | 0.5 | [friendly] Yorumlara… “gece” yaz… ücretsiz demo hattını… kuralım! | 9.0 | 4.24 | 0.0785 | 2 | 65 |

Rejected outliers: 01_1, 01_3, 02_3 and 06_2 were too slow (>0.11 s/char).

Characters used for this round: 1800 (all 27 takes). STT used 0 characters.
