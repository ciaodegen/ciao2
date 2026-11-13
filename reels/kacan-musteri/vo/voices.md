# Kaçan müşteri — Voiceover

Narrator only: **Hakan - Calm & Friendly** (`UZfpTmsEg4kOu9LAEgHd`), a male, middle-aged Turkish voice with an Istanbul accent.
Settings: model `eleven_v3`, `language_code: "tr"`, endpoint `/with-timestamps`, output `mp3_44100_128`.
Per line: 3 takes (takes 1–2 at stability 0.0, take 3 at 0.5). Line 06 got 3 extra takes (4–6) with the same text, because takes 1–3 were too fast.
All takes are in `takes/NN_k.*`. The chosen take is copied to `NN.mp3` / `NN.json`.

## Selection
- A take is valid when:
  - the TTS alignment reproduces the sent text exactly;
  - there is less than 0.2 s of sound inside each `[tag]`'s aligned span, so the tags are not spoken;
  - the pace is between 0.055 and 0.10 s per spoken character.
- Score = F0 range in semitones (librosa.pyin with fmin=60, fmax=300, 10th–90th percentile) + 0.5 × the number of pauses ≥150 ms, capped at the number of punctuation breaks. The highest-scoring valid take wins.
- No speech-to-text check: the API key lacks the `speech_to_text` permission, and local ASR models are blocked by the network. `transcript` is `null`.
- Line 04: every take has a pause before "rakibine" (0.18–0.35 s; 0.18 s in the chosen take 2).

## Chosen takes
| Line | Take | Stability | Text sent | Duration (s) | s/char | Pitch range (st) | Median F0 (Hz) | Pauses |
|---|---|---|---|---|---|---|---|---|
| 01 | 1 of 3 | 0.0 | [serious] Günde sadece beş cevapsız arama… | 2.48 | 0.0775 | 5.84 | 113.3 | 0 |
| 02 | 2 of 3 | 0.0 | [emphatic] …ayda yüz elli kaçan müşteri demek. | 2.56 | 0.0731 | 5.57 | 106.3 | 0 |
| 03 | 3 of 3 | 0.5 | [thoughtful] Müşteri başı bin lira desek… | 2.08 | 0.0743 | 7.7 | 123.5 | 0 |
| 04 | 2 of 3 | 0.0 | [dramatic] her ay yüz elli bin lira… rakibine gidiyor. | 2.72 | 0.0633 | 6.35 | 106.9 | 0 |
| 05 | 3 of 3 | 0.5 | [confident] [warmly] Mimoza ey-ay her aramayı açar. Gece, gündüz, bayramda bile. | 4.72 | 0.08 | 6.98 | 106.9 | 1 |
| 06 | 6 of 6 | 0.5 | [friendly] Yorumlara “hesapla” yaz, kaybını birlikte hesaplayalım. | 3.04 | 0.0553 | 7.86 | 113.3 | 1 |

Rejected: 06_1–06_4 were too fast (<0.055 s/char).
Characters used: 1185 (21 takes).
