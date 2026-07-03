#!/usr/bin/env python3
"""Generate MP3 assets for mindful meditation app using edge_tts."""

import asyncio
import edge_tts
import os

VOICES = {
    'aria': 'en-US-AriaNeural',
    'guy':  'en-GB-RyanNeural',
}
RATES = {
    'aria': '-10%',
    'guy':  '-18%',
}

METTA_TEXTS = {
    'opening_metta': "Welcome to your loving-kindness practice. Find a comfortable position. Today's intention: May all beings be at ease. Place a hand over your heart if it feels natural.",
    'body_metta_0': "Bring a gentle smile to your lips.",
    'body_metta_1': "Feel the warmth in your chest. Let it soften and open.",
    'body_metta_2': "Let your shoulders drop. Let your breath be easy.",
    'practice_metta_0': "Turn your attention inward. Silently repeat: May I be safe. May I be healthy. May I be happy. May I live with ease.",
    'practice_metta_1': "Now bring to mind someone you love dearly. Picture them clearly. Send them these words: May you be safe. May you be healthy. May you be happy. May you live with ease.",
    'practice_metta_2': "Now bring to mind a neutral person — someone you see but don't know well. A neighbor, a cashier. Send them: May you be safe. May you be healthy. May you be happy. May you live with ease.",
    'practice_metta_3': "Now, if it feels possible, bring to mind someone you find difficult. Without forcing it, offer: May you be safe. May you be healthy. May you be happy. May you live with ease.",
    'practice_metta_4': "Finally, expand your awareness in all directions. All beings everywhere: May all beings be safe. May all beings be healthy. May all beings be happy. May all beings live with ease.",
    'reminder_metta_0': "Return to the phrases. Let them soften your heart.",
    'reminder_metta_1': "Keep sending kindness outward.",
    'close_metta_0': "Slowly let the phrases fade. Return to your own breath.",
    'close_metta_1': "Notice how you feel. There is no right or wrong experience.",
    'close_metta_2': "Carry this kindness with you. Thank you for practicing.",
}

BODYSCAN_TEXTS = {
    'opening_bodyscan': "Welcome to your body scan practice. Lie down or sit comfortably. Today's intention: Meet your body with gentle attention.",
    'body_bodyscan_0': "Bring your attention to the top of your head. Notice any sensations there.",
    'body_bodyscan_1': "Slowly move down to your forehead and temples. Soften. Release.",
    'body_bodyscan_2': "Your eyes. The small muscles around them. Let them rest.",
    'body_bodyscan_3': "Your jaw. Let it unclench. The tongue rests gently behind the teeth.",
    'body_bodyscan_4': "Your neck and throat. Allow any tension to dissolve.",
    'body_bodyscan_5': "Your shoulders. Let them drop away from your ears.",
    'body_bodyscan_6': "Your upper arms. Your elbows. Your forearms. Soft and heavy.",
    'body_bodyscan_7': "Your hands. The palms. Each finger. Let them be loose.",
    'body_bodyscan_8': "Your chest. Feel the gentle rise and fall of breath.",
    'body_bodyscan_9': "Your belly. Soft and easy. No need to hold anything.",
    'body_bodyscan_10': "Your upper back and mid back. Releasing into the surface below.",
    'body_bodyscan_11': "Your lower back. Let it be heavy. Supported.",
    'body_bodyscan_12': "Your hips and pelvis. Let them sink and widen.",
    'body_bodyscan_13': "Your thighs. Your knees. Heavy and relaxed.",
    'body_bodyscan_14': "Your calves, your shins, your ankles. Fully letting go.",
    'practice_bodyscan_0': "Your feet. The soles, the arches, each toe. Soft and at rest.",
    'practice_bodyscan_1': "Now feel your whole body as one field of sensation. Breathing as a whole.",
    'reminder_bodyscan_0': "Scan again any area that still holds tension.",
    'reminder_bodyscan_1': "Soften a little more with each breath.",
    'close_bodyscan_0': "Slowly bring awareness back to the room.",
    'close_bodyscan_1': "Wiggle your fingers and toes. Gently stretch.",
    'close_bodyscan_2': "Notice how your body feels now. Thank you for practicing.",
}

TEXTS = {**METTA_TEXTS, **BODYSCAN_TEXTS}

OUT_BASE = os.path.join(os.path.dirname(__file__), 'audio')


async def generate_all():
    for folder, voice in VOICES.items():
        out_dir = f"{OUT_BASE}/{folder}"
        for key, text in TEXTS.items():
            out_path = f"{out_dir}/{key}.mp3"
            communicate = edge_tts.Communicate(text, voice, rate=RATES[folder])
            await communicate.save(out_path)
            print(f"  ✓ {folder}/{key}.mp3")
    print("\nAll done.")


if __name__ == '__main__':
    asyncio.run(generate_all())
