# Higgsfield prompt: Turkistan runner route

Use one consistent seed, visual reference, camera height, and lighting setup for every frame. Generate each segment as a separate 16:9 still image, not a video. The game supplies the moving player, lanes, obstacles, and interface.

## Shared direction

```text
Create a polished 16:9 background plate for a child-friendly three-lane runner game set in Turkistan, Kazakhstan.

Camera and composition:
- Third-person runner-game camera, approximately 1.4 metres above the ground.
- One wide route begins at the bottom centre and narrows to a central vanishing point on the horizon.
- Keep the central 45 percent visually quiet so the game can overlay three lanes, a player, stars, rocks, and vocabulary gates.
- Place architecture, trees, market details, and landscape mainly along the outer left and right thirds.
- The route must remain continuous and readable from the foreground to the horizon.

Art direction:
- Bright stylized realism suitable for children ages 6-12.
- Warm daylight, clear shapes, natural colours, and recognizable Kazakh cultural details.
- Respectful, geographically plausible depiction of Turkistan.
- Consistent perspective, road width, horizon, colour grade, and weather across every segment.
- No people in the playable route, no vehicles, no text, no signs with lettering, no UI, no player character, no coins, no obstacles, no watermark.

Output:
- 1920x1080 or higher.
- Crisp foreground and midground; mild atmospheric depth only at the horizon.
- Still background plate with no motion blur.
```

## Segment prompts

Append one of these to the shared direction for each generation:

1. **Approach:** `A broad steppe approach toward Turkistan, low grasses and distant blue domes visible on the horizon.`
2. **Old city:** `A route beside warm adobe walls and traditional geometric details, with the playable centre completely unobstructed.`
3. **Caravan garden:** `A green garden and shaded caravan-rest details at the route edges, with fountains and trees outside the central lane area.`
4. **Mausoleum approach:** `The Mausoleum of Khoja Ahmed Yasawi becomes clearly recognizable in the middle distance, placed beside rather than on top of the playable route.`
5. **Arrival:** `A celebratory open plaza near the Mausoleum of Khoja Ahmed Yasawi, with a clear finish corridor and architecture framing the scene from both sides.`

## Consistency pass

After generating all five images, use the first accepted frame as a reference for the remaining four. Reject any frame where the horizon moves, the route changes width, a landmark blocks the centre, or the architectural style becomes generic Middle Eastern fantasy rather than Turkistan.
