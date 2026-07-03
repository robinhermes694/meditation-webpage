"""Generate Kokoro TTS meditation audio files for the Mindful app.

Female voice : af_nicole with blend (af_nicole:70 + af_heart:30)
Male voice   : bm_fable (single)
Speed        : 0.85 (slow meditation pace)
"""
import subprocess
import os
import tempfile

KOKORO_BIN = '/usr/local/lib/hermes-agent/venv/bin/kokoro-tts'
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'kokoro-models')
OUT_FEMALE  = os.path.join(os.path.dirname(__file__), 'audio', 'kokoro-aria')
OUT_MALE    = os.path.join(os.path.dirname(__file__), 'audio', 'kokoro-guy')
SPEED = 0.85

PHRASES = {
    # Core openings
    'opening_calm': 'Welcome to your morning calm practice. Find a comfortable position. You can keep your eyes open or closed. There is no right way to do this. Today\'s intention: Let today be gentle. There is nowhere else you need to be.',
    'opening_focus': 'Welcome to your focus practice. Find a comfortable position. You can keep your eyes open or closed. There is no right way to do this. Today\'s intention: One thing at a time. Clarity comes from a quiet mind.',
    'opening_sleep': 'Welcome to your sleep practice. Find a comfortable position. You can keep your eyes open or closed. There is no right way to do this. Today\'s intention: Let go of the day. You have done enough. Rest now.',
    'opening_gratitude': 'Welcome to your gratitude practice. Find a comfortable position. You can keep your eyes open or closed. There is no right way to do this. Today\'s intention: Notice what matters. Open your heart gently.',
    'opening_metta': 'Welcome to your loving-kindness practice. Find a comfortable position. Today\'s intention: May all beings be at ease. Place a hand over your heart if it feels natural.',
    'opening_bodyscan': 'Welcome to your body scan practice. Lie down or sit comfortably. Today\'s intention: Meet your body with gentle attention.',

    # Breathing cues
    'breathe_in_1': 'Breathe in slowly...',
    'breathe_out_1': 'And breathe out...',
    'breathe_in_2': 'Breathe in...',
    'breathe_out_2': 'And breathe out...',
    'breathe_in_3': 'One more deep breath in...',
    'breathe_out_3': 'And gently release...',

    # Calm theme
    'relax_intro_calm': 'Now let\'s release some tension. I\'ll guide you through a few areas. You don\'t need to do anything special — just allow each area to soften.',
    'body_calm_0': 'Notice the weight of your body against the surface beneath you.',
    'body_calm_1': 'Soften the area around your eyes. Let the muscles in your forehead rest.',
    'body_calm_2': 'Unclench your jaw, allowing the teeth to slightly part.',
    'body_calm_3': 'Let your shoulders drop away from your ears.',
    'body_calm_4': 'Release any tension in your hands. Let the fingers be loose.',
    'practice_calm_0': 'Now let your attention settle on your breath. No need to change it.',
    'practice_calm_1': 'Feel the gentle rise and fall of your chest.',
    'practice_calm_2': 'Allow each breath to be effortless.',
    'practice_calm_3': 'It is okay if thoughts arise. Let them pass like clouds.',
    'practice_calm_4': 'Return to the breath, again and again. That is the practice.',
    'reminder_calm_0': 'Stay with the sensations of breathing.',
    'reminder_calm_1': 'Let thoughts pass without following them.',
    'reminder_calm_2': 'Each breath is a small moment of peace.',
    'close_calm_0': 'Slowly bring your awareness back to the room.',
    'close_calm_1': 'Wiggle your fingers and toes. Gently stretch if you wish.',
    'close_calm_2': 'Carry this sense of calm with you into your day.',
    'close_calm_3': 'Thank you for practicing.',

    # Focus theme
    'relax_intro_focus': 'Now let\'s release some tension. I\'ll guide you through a few areas. You don\'t need to do anything special — just allow each area to soften.',
    'body_focus_0': 'Let your body be still and alert.',
    'body_focus_1': 'Release tension in your shoulders and neck.',
    'body_focus_2': 'Keep your spine tall but not rigid.',
    'body_focus_3': 'Relax your belly. Let your breath move freely.',
    'practice_focus_0': 'Rest your attention at the tip of your nose.',
    'practice_focus_1': 'Notice the cool air as you breathe in, the warm air as you breathe out.',
    'practice_focus_2': 'When your mind wanders, gently return to this single point.',
    'practice_focus_3': 'This single point is all you need.',
    'practice_focus_4': 'Let everything else fall away.',
    'reminder_focus_0': 'Return to the breath. Just this one breath.',
    'reminder_focus_1': 'Stay anchored at the nostrils.',
    'reminder_focus_2': 'One moment of focus. Then the next.',
    'close_focus_0': 'Slowly release your focus.',
    'close_focus_1': 'Stretch, roll your shoulders, look around.',
    'close_focus_2': 'You have trained your attention. Use it with intention.',
    'close_focus_3': 'Thank you for practicing.',

    # Sleep theme
    'relax_intro_sleep': 'Now let\'s release some tension. I\'ll guide you through a few areas. You don\'t need to do anything special — just allow each area to soften.',
    'body_sleep_0': 'Allow your body to feel heavy. Each part sinking into the surface.',
    'body_sleep_1': 'Soften your forehead. Smooth the skin between your brows.',
    'body_sleep_2': 'Let your jaw unclench. The tongue rests gently.',
    'body_sleep_3': 'Let your shoulders melt downward, farther with every breath.',
    'body_sleep_4': 'Release your hips, your thighs, your calves. Ankles loose.',
    'practice_sleep_0': 'Imagine yourself in a warm, quiet place.',
    'practice_sleep_1': 'With each exhale, let go of something you no longer need to carry.',
    'practice_sleep_2': 'There is nothing to solve. Nothing to finish.',
    'practice_sleep_3': 'Drifting. Floating. Safe.',
    'practice_sleep_4': 'Let the boundary between waking and sleep blur.',
    'reminder_sleep_0': 'Let go a little more.',
    'reminder_sleep_1': 'Only rest matters now.',
    'reminder_sleep_2': 'Let sleep come gently.',
    'close_sleep_0': 'If sleep has come, allow it.',
    'close_sleep_1': 'If you are still awake, stay in this restful state a little longer.',
    'close_sleep_2': 'When you are ready, close this and rest fully.',
    'close_sleep_3': 'Goodnight.',

    # Gratitude theme
    'relax_intro_gratitude': 'Now let\'s release some tension. I\'ll guide you through a few areas. You don\'t need to do anything special — just allow each area to soften.',
    'body_gratitude_0': 'Bring a small smile to your lips, if it feels natural.',
    'body_gratitude_1': 'Place a hand over your heart if you wish.',
    'body_gratitude_2': 'Feel the warmth of your own touch.',
    'practice_gratitude_0': 'Consider one small thing you are grateful for right now.',
    'practice_gratitude_1': 'It might be the breath. The sound of music. A memory.',
    'practice_gratitude_2': 'Let the feeling of gratitude grow.',
    'practice_gratitude_3': 'Do not force it. Just notice what is already here.',
    'practice_gratitude_4': 'Gratitude is already present if you look for it.',
    'reminder_gratitude_0': 'Notice one more thing you appreciate.',
    'reminder_gratitude_1': 'Let gratitude rest in your chest.',
    'reminder_gratitude_2': 'This moment is enough.',
    'close_gratitude_0': 'Carry this gratitude into your next hour.',
    'close_gratitude_1': 'You can return to it whenever you like.',
    'close_gratitude_2': 'Thank you for practicing.',

    # Metta theme
    'body_metta_0': 'Bring a gentle smile to your lips.',
    'body_metta_1': 'Feel the warmth in your chest. Let it soften and open.',
    'body_metta_2': 'Let your shoulders drop. Let your breath be easy.',
    'practice_metta_0': 'Turn your attention inward. Silently repeat: May I be safe. May I be healthy. May I be happy. May I live with ease.',
    'practice_metta_1': 'Now bring to mind someone you love dearly. Picture them clearly. Send them these words: May you be safe. May you be healthy. May you be happy. May you live with ease.',
    'practice_metta_2': 'Now bring to mind a neutral person. Someone you see but don\'t know well. A neighbor, a cashier. Send them: May you be safe. May you be healthy. May you be happy. May you live with ease.',
    'practice_metta_3': 'Now, if it feels possible, bring to mind someone you find difficult. Without forcing it, offer: May you be safe. May you be healthy. May you be happy. May you live with ease.',
    'practice_metta_4': 'Finally, expand your awareness in all directions. All beings everywhere: May all beings be safe. May all beings be healthy. May all beings be happy. May all beings live with ease.',
    'reminder_metta_0': 'Return to the phrases. Let them soften your heart.',
    'reminder_metta_1': 'Keep sending kindness outward.',
    'close_metta_0': 'Slowly let the phrases fade. Return to your own breath.',
    'close_metta_1': 'Notice how you feel. There is no right or wrong experience.',
    'close_metta_2': 'Carry this kindness with you. Thank you for practicing.',

    # Bodyscan theme
    'body_bodyscan_0': 'Bring your attention to the top of your head. Notice any sensations there.',
    'body_bodyscan_1': 'Slowly move down to your forehead and temples. Soften. Release.',
    'body_bodyscan_2': 'Your eyes. The small muscles around them. Let them rest.',
    'body_bodyscan_3': 'Your jaw. Let it unclench. The tongue rests gently behind the teeth.',
    'body_bodyscan_4': 'Your neck and throat. Allow any tension to dissolve.',
    'body_bodyscan_5': 'Your shoulders. Let them drop away from your ears.',
    'body_bodyscan_6': 'Your upper arms. Your elbows. Your forearms. Soft and heavy.',
    'body_bodyscan_7': 'Your hands. The palms. Each finger. Let them be loose.',
    'body_bodyscan_8': 'Your chest. Feel the gentle rise and fall of breath.',
    'body_bodyscan_9': 'Your belly. Soft and easy. No need to hold anything.',
    'body_bodyscan_10': 'Your upper back and mid back. Releasing into the surface below.',
    'body_bodyscan_11': 'Your lower back. Let it be heavy. Supported.',
    'body_bodyscan_12': 'Your hips and pelvis. Let them sink and widen.',
    'body_bodyscan_13': 'Your thighs. Your knees. Heavy and relaxed.',
    'body_bodyscan_14': 'Your calves, your shins, your ankles. Fully letting go.',
    'practice_bodyscan_0': 'Your feet. The soles, the arches, each toe. Soft and at rest.',
    'practice_bodyscan_1': 'Now feel your whole body as one field of sensation. Breathing as a whole.',
    'reminder_bodyscan_0': 'Scan again any area that still holds tension.',
    'reminder_bodyscan_1': 'Soften a little more with each breath.',
    'close_bodyscan_0': 'Slowly bring awareness back to the room.',
    'close_bodyscan_1': 'Wiggle your fingers and toes. Gently stretch.',
    'close_bodyscan_2': 'Notice how your body feels now. Thank you for practicing.',

    # Shared
    'transition': 'Good. Now my voice will guide you gently. There will be quiet spaces in between. Let your breath find its own pace.',
    'quiet_intro': 'My voice will be quiet for a while. Just rest in your experience.',
    'session_complete': 'Session complete.',
    'settling': 'Let\'s take three deep breaths together.',
}

SKIPPED = []

def gen(text, output_path, voice, speed=SPEED):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(text)
        tmp = f.name
    try:
        subprocess.run([
            KOKORO_BIN,
            tmp, output_path,
            '--voice', voice,
            '--speed', str(speed),
            '--lang', 'en-us',
            '--format', 'mp3'
        ], cwd=MODELS_DIR, check=True, capture_output=True)
    finally:
        os.unlink(tmp)

total = len(PHRASES)
done = 0

for key, text in sorted(PHRASES.items()):
    out_f = os.path.join(OUT_FEMALE, key + '.mp3')
    out_m = os.path.join(OUT_MALE,   key + '.mp3')

    # Skip if already generated
    if os.path.exists(out_f) and os.path.exists(out_m):
        print(f'  [skip] {key} (already exists)')
        done += 1
        continue

    try:
        if not os.path.exists(out_f):
            gen(text, out_f, 'af_nicole:70,af_heart:30')
        if not os.path.exists(out_m):
            gen(text, out_m, 'bm_fable')
        done += 1
        if done % 10 == 0 or done == total:
            print(f'  [{done}/{total}] done — last: {key}')
    except subprocess.CalledProcessError as e:
        SKIPPED.append(key)
        print(f'  [ERROR] {key}: {e.stderr.decode()[:120]}')

print(f'\nDone. Generated {done}/{total} phrases.')
if SKIPPED:
    print(f'Skipped with errors: {SKIPPED}')
else:
    print('No errors.')
