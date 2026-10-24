# Portrait Coach

Crop a reference photo, look at it in tones, and trace it onto paper through your phone's camera.

1. **Crop and adjust:** choose a photo (or a recent one, or a sample) and a shape (1:1, 4:5, 3:4, 2:3, A4, portrait or landscape). Drag and pinch the photo under the frame, and set brightness, contrast and black & white.
2. **Trace:** turn on the camera, pick how the photo blends with it (Normal, Multiply, Darken and more), and set how strong it is. Step through the tones (Photo, then 8 steps that add one darker pencil layer at a time, ending on 9 tones). Drag, pinch and twist to line it up with your paper; Fit and Fill straighten and re-centre it.
   - A spirit level shows when the phone is parallel to the paper. For a sloped board, lay the phone on the paper and tap Calibrate.

Plain HTML, CSS and JS. No build step. Photos stay in the browser.

```
python3 -m http.server   # then open http://localhost:8000
```

Deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

The interface uses the Graphite design system: `assets/graphite/tokens.css` is generated from Graphite's `tokens.json`, and `assets/graphite/components.css` is its component stylesheet, unchanged.
