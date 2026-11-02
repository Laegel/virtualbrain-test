# Arena background: art guide

The battle screen draws `web-app/public/arena/stadium.webp` behind the two fighters. If the file is missing, the
screen falls back to a stage tinted with the fighters' type colours.

## The shipped image

Generated with Google Gemini from the prompt below, in one try (1376 x 768, converted to WebP, 56 KB). The prompt asked
for the spots at 27% / 73% across, 80% down, 22% of the width. Gemini put them at about **24% / 76% across, 73% down,
and about 40% of the width**, so `ARENA_SPOTS` in `web-app/src/features/arena/ArenaStage.tsx` is calibrated to the real
image. To swap the art: replace the file, re-measure the spots, update those numbers.

## What the screen needs from the image

| Need | Why |
|---|---|
| **16:9 landscape**, at least 1600 x 900 | The stage is 16:9 on desktop and 4:3 on phones (the sides are cropped) |
| **Two battle spots on the floor**: same size, same ground level, left and right | The fighters stand on them |
| Left spot centre at about **27% from the left, 80% from the top**; right spot at about **73%, 80%** | These are the `ARENA_SPOTS` in `web-app/src/features/arena/ArenaStage.tsx`. If the art differs, we change the numbers, not the art |
| Each spot about **22% of the image width** | Fighters are drawn at about that width |
| **Calm top corners** and calm top centre | Name and HP panels sit in the top corners, "VS" and move chips near the centre |
| **No creatures, people, text or logos** | The Pokémon are drawn on top; also keeps the art original for a public repo |

## Prompt (Gemini image generation)

```
A wide 16:9 illustration of an empty outdoor Pokémon-style battle arena. No creatures, no characters, no people,
no text, no logos, no watermarks.

Composition: symmetrical, camera at eye level slightly above the ground. The lower half is a flat stone-tiled battlefield
with two clearly visible, identical circular painted battle spots on the same ground level: one on the left (centre at
27% from the left edge and 80% from the top), one on the right (centre at 73% from the left edge and 80% from the top),
each about 22% of the image width. Clean, empty floor between and around them.

Background: a stadium with stands full of blurred crowd silhouettes, neutral coloured banners, soft floodlights, a bright
sky with light clouds, strong depth-of-field blur behind the field. Keep the top third calm and uncluttered,
especially the two top corners and the top centre.

Style: clean painterly game illustration with soft cel shading, vibrant but slightly desaturated colours, matching the
look of official Pokémon artwork. Warm afternoon light, soft shadows.
```

If the spots come out in the wrong place, regenerate once or twice; otherwise tell me where they ended up and I
adjust the numbers.

## Putting it in

Save the image anywhere (PNG or JPG is fine) and tell me the path. I resize it to 1600 px wide, convert it to WebP and
write it to `web-app/public/arena/stadium.webp`.

## Later (optional): one arena per type

Same prompt, replacing the background and the floor line. Suggested groups:

| Group | Types | Swap in the prompt |
|---|---|---|
| Meadow | grass, bug, normal | green hills, flowers, stone-tiled floor |
| Volcano | fire, rock, ground | lava glow, dark basalt floor, ash sky |
| Coast | water, ice | sea behind, wet tiles / frozen floor, cold light |
| City | electric, steel, fighting | neon, metal floor, night sky |
| Mystic | psychic, ghost, dark, fairy, poison | purple dusk, floating lanterns, mist |
| Sky | flying, dragon | clouds, floating stone floor |
