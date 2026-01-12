# Nano Banana Pro Prompting Reference

Authoritative reference for crafting optimized Nano Banana Pro (Gemini 3 Pro Image) prompts.

---

## Model Capabilities Summary

| Capability | Specification |
|------------|---------------|
| Max resolution | 4K (4096×4096) |
| Reference images | Up to 14 |
| Character consistency | Up to 5 faces |
| Text rendering accuracy | ~94% for short text |
| Thinking mode | Always enabled (cannot disable) |
| Real-time data | Google Search grounding available |

**Critical warning**: Users may be silently downgraded to Flash model (2.5) if quota exceeded. Detection: "Thinking..." indicator must appear during generation. If generation starts instantly, prompt is running on inferior model.

---

## The Six Essential Components

Every production prompt must address these six components in order:

### 1. Subject

The core noun/entity. Must be specific with distinguishing details.

| Weak | Strong |
|------|--------|
| "A dog" | "A Shiba Inu with a metallic cybernetic eye" |
| "Fantasy armor" | "Ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings" |
| "A woman" | "A sophisticated elderly woman in a vintage Chanel suit" |

### 2. Action

Verb or state of being. Defines what subject is doing.

**Static images default to generic "standing" poses.** Always specify action:
- "leaping through the air"
- "confidently leaning against a doorframe"
- "mid-stride with coat billowing"
- "intense concentration while examining documents"
- "analyzing data on holographic display"

### 3. Location

Environment/setting providing spatial context.

**Examples:**
- "on a rain-soaked Tokyo street at night, wet pavement reflections of city lights"
- "inside a minimalist Scandinavian studio with floor-to-ceiling windows"
- "against a gradient backdrop transitioning from deep navy to soft coral"
- "a bustling fish market at dawn"
- "a white background" (valid for product shots)

### 4. Composition

Camera angle, framing, perspective. Dictates visual structure.

| Term | Effect |
|------|--------|
| **Macro** | Extreme detail, shallow depth of field |
| **Wide-angle** | Dramatic perspective, exaggerated depth |
| **Isometric** | Technical/diagram view, 3D in 2D |
| **Top-down/Bird's-eye** | Overhead perspective |
| **Worm's-eye** | Ultra low angle, subject appears powerful |
| **Telephoto/compression** | Flattens depth between subject and background |

**Framing terms:**
- "extreme close-up filling 85% of frame"
- "A 9:16 vertical poster"
- "cinematic 21:9 wide shot"
- "centered, shallow depth of field (f/2.8)"

### 5. Lighting

Illumination physics defining mood and realism.

| Descriptor | Effect |
|------------|--------|
| "golden hour backlighting" | Warm rim-light separation |
| "chiaroscuro side-lighting" | Dramatic shadows, Renaissance feel |
| "softbox high-key" | Even, commercial/product look |
| "neon cyberpunk" | Colored artificial light, sci-fi |
| "Rembrandt lighting" | Key light at 45°, triangle shadow under eye |
| "harsh noon sunlight" | Strong shadows, high contrast |
| "soft natural daylight from window on left" | Directional but gentle |

### 6. Style/Medium

Artistic rendering mode defining texture and finish.

**Photography styles:**
- "photorealistic 8K, phase one camera system"
- "35mm film aesthetic, natural imperfections"
- "high-end advertising photography"
- "candid street photography"

**Illustration styles:**
- "oil painting with visible brushstrokes"
- "flat vector design, no gradients"
- "watercolor with soft edges"
- "comic book style with bold ink lines"
- "Studio Ghibli animation aesthetic"

**3D/Digital:**
- "Unreal Engine 5 render"
- "glossy claymorphism"
- "isometric 3D icons"

---

## Technical Parameters

### Aspect Ratios

| Ratio | Dimensions (4K) | Use Case |
|-------|-----------------|----------|
| 1:1 | 2048×2048 | Instagram, profile pictures |
| 16:9 | 3840×2160 | Presentations, YouTube thumbnails |
| 9:16 | 2160×3840 | Mobile stories, TikTok, book covers |
| 4:3 | 2730×2048 | Classic photography, tablets |
| 4:5 | — | Instagram posts |
| 21:9 | 5120×2160 | Ultrawide cinema, web banners |
| 2:3, 3:2 | — | Standard photography |

**Syntax:**
- Natural language: "Generate a 16:9 cinematic shot..."
- API: `"aspectRatio": "16:9"` (quotes required)

### Resolution

| Size | Pixels | Use Case |
|------|--------|----------|
| 1K | ~1024px | Quick drafts, web thumbnails |
| 2K | ~2048px | Web use, social media |
| 4K | ~4096px | Print, detailed text, professional |

**API syntax**: Uppercase required — `"4K"` not `"4k"`

### Camera/Lens Specifications

For photorealistic work, specify equipment:

```
"Shot on Sony A7III with 85mm f/1.4"
"100mm macro lens, f/2.8 aperture"
"14mm fisheye lens, distorted ultra-wide"
"200mm telephoto, compression effect"
```

**Depth of field:**
- Shallow: "f/1.8 with natural bokeh, background softly blurred"
- Deep: "f/11, everything in focus"

---

## Advanced Techniques

### Pseudo-Code Variable Injection

Structures prompt like code. Model treats defined labels as stable conceptual containers, reducing attribute drift.

**When to use:**
- Complex scenes with multiple characters/objects
- Product sequences
- Technical diagrams
- Anything requiring internal consistency

**Template:**
```
// Define Variables
var Subject_A = "[detailed description A]"
var Subject_B = "[detailed description B]"
var Setting = "[environment details]"
var Lighting = "[lighting setup]"

// Execution
Generate an image where {Subject_A} is [action] with {Subject_B} in {Setting}.
Apply {Lighting} to ensure [specific effect].
Ensure {Subject_A} retains [attribute constraints] and {Subject_B} retains [attribute constraints].
```

**Alternative syntax:**
```
Define OBJECT_A as [description].
Define TEXTURE_B as [description].
Define LIGHTING_C as [description].

Create [image type] where OBJECT_A [placement].
Apply TEXTURE_B across [surface].
Use LIGHTING_C to [effect].
```

**Expected outcome:** 30% reduction in attribute drift compared to natural-language repetition.

### Perspective Blending

Intentionally merge multiple perspectives for creative effect or comprehensive information display.

**When to use:**
- Surreal art
- Technical diagrams (cutaway views)
- Scenes requiring layered information

**Example:**
```
Multi-Perspective Illustration: Show both exterior and interior of [SUBJECT] in one image.
Left half: [exterior perspective] with [environmental context].
Right half transitions into [interior cutaway view] showing [internal details].
Style: [unified aesthetic]. Perspectives merge seamlessly at center.
```

**Spatial cue blending:**
```
A [scene] at [time], captured from [primary viewpoint],
but with spatial depth cues suggesting simultaneous observation from [secondary viewpoint]—
showing both [intimate detail] and [broader pattern].
[Camera specs], [lighting].
```

### Intentional Imperfection

Strategic photographic imperfections break sterile "AI look."

**When to use:**
- Hyper-realistic renders
- Vintage/historical styles
- Documentary aesthetic
- When authenticity outweighs technical perfection

**Keywords by category:**

| Category | Keywords |
|----------|----------|
| **Textures** | subsurface scattering, skin pores, fabric piling, dust motes, scratches on metal, skin texture with visible imperfections |
| **Camera artifacts** | chromatic aberration, film grain, motion blur, slight overexposure on highlights, vignetting, lens flare |
| **Contextual mess** | cluttered desk, worn edges, rust spots, fingerprints on glass, coffee ring stain |
| **Film stocks** | Kodachrome color shift, uneven chemical development, 35mm film grain |

**Key principle:** Specify the *kind* of imperfection and *how* it manifests:
- "minor overexposure in bright areas"
- "subtle vignette from aging compact camera"
- "film grain at ISO 800 equivalent"
- "visible skin texture with pores—no airbrushing"

### 14-Image Context Window

Upload reference images for style transfer and character consistency.

**Workflow:**
1. Gather 5 images of target character (different angles/expressions)
2. Gather 5 images of target visual style
3. Structure prompt: "Using the first 5 images as character reference and last 5 as style guide, generate [description]"

**Constraint:** Model maintains up to **5 distinct faces** reliably. Beyond that, faces may blend.

### Conversational Editing

Iterative refinement rather than regeneration.

**Workflow:**
```
Initial: "[base prompt]"
Edit 1: "Perfect composition—now [specific change 1]"
Edit 2: "[specific change 2]"
Edit 3: "[specific change 3]"
```

**API requirement:** Responses include `thought_signature` fields that **must** be passed back in subsequent turns. SDKs handle automatically; raw API users must circulate manually.

---

## Text Rendering

Nano Banana Pro uses dedicated text encoder separate from visual diffusion.

### Capabilities

- Short taglines: ~94% accuracy
- Full sentences: ~80-90% accuracy
- Paragraphs (50+ words): May experience warping/spelling errors

### Syntax

**Always enclose text in double quotes:**
```
text: "Hello World"
Ensure label text "BRAND NAME" is perfectly legible
```

### Optimization Tips

1. Keep text concise — taglines over paragraphs
2. Use 4K resolution for significant text
3. Specify font style: "clear bold sans-serif font"
4. Ensure high contrast with background
5. Break long text into multiple shorter elements

### Multilingual Support

Native support for: Latin, Chinese, Japanese, Korean scripts

---

## Success Rates by Task Type

| Task Type | Success Rate | Notes |
|-----------|--------------|-------|
| Simple edits | ~99% | State edit clearly |
| Single-subject photorealistic | ~95-100% | Use detailed descriptors |
| Multi-subject scene | ~90% | Use references or pseudo-code |
| Infographic (few words) | ~90-95% | Title/labels render well |
| Infographic (paragraph) | ~70-80% | Keep chunked, use 4K |
| Logo/stylized text | ~90% | Model blends text with art well |
| Character consistency | ~90-95% | Use 5 reference images |
| UI with many elements | ~80% | Break into sections |
| Crowded scenes (6+ characters) | ~70% | Iterate with specific additions |

---

## Troubleshooting

### Error Diagnostics

| Issue | Cause | Solution |
|-------|-------|----------|
| Text garbled/misspelled | Flash model active, or text not quoted | Verify "Thinking" indicator; enclose text in double quotes |
| Waxy/AI look | Lack of imperfection | Add "film grain," "skin texture," "natural lighting" |
| Attribute drift | Elements merging | Use pseudo-code variables |
| Faces blending | Too many characters | Reduce to ≤5; use reference images |
| Missing elements | Buried in long prompt | Mention key elements early; use two-pass approach |
| Wrong style | Ambiguous phrasing | Separate content vs. style clearly |
| Silent downgrade | Quota exceeded | Wait and retry; verify "Thinking" indicator |
| API: "missing thought_signature" | Signature not passed | Capture and return thoughtSignature in subsequent requests |
| Safety filter blocked | Ambiguous keywords | Rephrase to focus on visual style, not action |

### Two-Pass Approach

When elements are missing:
1. Generate base image (90% of elements)
2. Edit prompt: "Keep everything, add [missing element] in [location]"

---

## Template Library

### Product Photography

```
Ultra-realistic studio photograph of [PRODUCT] on [BACKGROUND],
centered, fills approximately [X]% of frame,
[LENS] look, f/[APERTURE] sharpness, ISO [VALUE],
[LIGHTING SETUP] with [SHADOW TYPE],
natural true-to-life colors,
no props, no text, no logos, no watermark,
[ASPECT RATIO] composition, [RESOLUTION] resolution.
```

### Professional Portrait

```
Keep facial features of uploaded image exactly consistent.
Dress in [ATTIRE DESCRIPTION].
Background: [BACKDROP TYPE].
Photography: [CAMERA] with [LENS], [EFFECT].
Lighting: [SETUP]—key light at [ANGLE] creating [SHADOW TYPE],
fill at [INTENSITY], rim light [PLACEMENT].
Details: [SKIN DETAIL LEVEL],
natural catchlights in eyes, visible fabric texture.
[ASPECT RATIO], [RESOLUTION].
```

### Infographic

```
Task: Create [TYPE] titled "[TITLE]".
Structure:
1. Header: Bold text "[HEADING]" at top in [FONT STYLE].
2. Section 1: [CONTENT WITH LABELS].
3. Section 2: [CONTENT WITH LABELS].
4. Footer: [ATTRIBUTION].
Style: [DESIGN STYLE], [COLOR PALETTE],
clean lines, [AESTHETIC].
Text: Ensure all labels are legible, [FONT GUIDANCE].
```

### Character Storyboard

```
Context: [N] reference images of "[CHARACTER]" ([DESCRIPTION]).
Instruction: Generate [N]-panel storyboard.

Panel 1: [SHOT TYPE] of [CHARACTER] [ACTION]. [EXPRESSION/MOOD].
Panel 2: [SHOT TYPE] of [CHARACTER] [ACTION]. [EXPRESSION/MOOD].
Panel 3: [SHOT TYPE] of [CHARACTER] [ACTION]. [EXPRESSION/MOOD].

Consistency: Maintain exact [FEATURES] from reference images.
Style: [UNIFIED AESTHETIC], [LIGHTING STYLE].
```

### Conversational Edit Sequence

```
Initial: "[COMPLETE BASE PROMPT]"
Edit 1: "Perfect composition—now [CHANGE 1]"
Edit 2: "[CHANGE 2]"
Edit 3: "[CHANGE 3]"
```

### Real-Time Data Visualization

```
Task: Visualize [DATA TYPE] for [SUBJECT] as [VISUAL FORMAT].
Data Source: Use Google Search to fetch [SPECIFIC DATA POINTS].
Visuals:
● [CONDITIONAL VISUAL 1]
● [CONDITIONAL VISUAL 2]
● [DATA DISPLAY FORMAT]
Style: [DESIGN STYLE], [COLOR SCHEME].
```

---

## Syntax Quick Reference

### Natural Language Prompt Structure

```
[Shot type/Style] of [Subject], [Action/Expression], set in [Environment].
The scene is illuminated by [Lighting], creating a [Mood] atmosphere.
Captured with [Camera/Lens], emphasizing [Key details].
[Aspect ratio] format.
```

### Pseudo-Code Structure

```
// Define Variables
var [NAME] = "[description]"

// Execution
Generate [image type] where {NAME} [action/placement].
Apply [constraints].
```

### Component Checklist

- [ ] Subject clearly defined with specific details
- [ ] Action or state of being described
- [ ] Location/environment provided
- [ ] Composition and framing specified
- [ ] Lighting direction and quality described
- [ ] Style reference or aesthetic direction included
- [ ] Aspect ratio declared
- [ ] Resolution specified (2K/4K)
- [ ] Text in double quotes (if applicable)
- [ ] Negative constraints if needed (no text, no watermark)

---

## API Configuration

```json
{
  "model": "gemini-3-pro-image-preview",
  "generation_config": {
    "temperature": 1.0,
    "media_resolution": "high"
  }
}
```

**Required settings:**
- `response_modalities`: `['TEXT', 'IMAGE']`
- `image_size`: Uppercase (`"4K"` not `"4k"`)
- `aspectRatio`: Quoted string (`"16:9"`)

**For Search grounding:**
```python
tools=[types.Tool(google_search=types.GoogleSearch())]
```
