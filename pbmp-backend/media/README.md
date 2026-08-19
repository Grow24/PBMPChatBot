# Put your media files in this folder (same names as WhatsApp commands).

## Commands → filenames

| Type on WhatsApp | Put a file named (any matching extension) |
|------------------|-------------------------------------------|
| `image1` | `image1.jpg` / `.png` / `.webp` / `.jpeg` |
| `image2` | `image2.jpg` … |
| `image3` | `image3.jpg` … |
| `video1` | `video1.mp4` / `.mov` / `.webm` |
| `video2` | `video2.mp4` … |
| `video3` | `video3.mp4` … |
| `audio1` | `audio1.mp3` / `.ogg` / `.m4a` / `.aac` |
| `audio2` | `audio2.mp3` … |
| `3d_image1` | `3d_image1.glb` / `.gltf` / `.usdz` / `.zip` |
| `3d_image2` | `3d_image2.glb` … |
| `animated_image1` | `animated_image1.mp4` (GIF also kept; WhatsApp gets MP4 video) |
| `animated_image2` | `animated_image2.mp4` |
| `gif1` | `gif1.mp4` |
| `gif2` | `gif2.mp4` |

> Note: WhatsApp Cloud API does **not** reliably send raw `.gif` as `image`. We convert animated GIFs to `.mp4` and send as `video`.

## How it works

1. You upload/copy the file into this `media/` folder (and redeploy), **or** set a public URL env var.
2. User types `image1` in WhatsApp (Other section).
3. Backend sends that file to WhatsApp via WAPI.

Public URL used by WhatsApp/WAPI:
`{PUBLIC_BASE_URL}/media/image1.jpg`

Set on Zeabur:
```
PUBLIC_BASE_URL=https://pbmpchatbotbackend.zeabur.app
```

Optional URL overrides (if file is on CDN, not in this folder):
```
MEDIA_CMD_IMAGE1_URL=https://cdn.example.com/my-photo.jpg
MEDIA_CMD_VIDEO1_URL=https://cdn.example.com/clip.mp4
```
