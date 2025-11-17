I want a new page in the app at /draw and it should do the following: it should accept an image file and use the selected file as input. Then it should load the image in the drawing reference (look at how the drawing reference component works). But I want some key differences. First, the image should be converted to black and white. Then the number of shades should be 8 and normalize the grays to the nearest gray. So basically there should be 8 distinct colours including black and white.

The steps in the page should be as follows:
1. Show an image where all gray shades darket or equal to the 4th shade in the 4th shade color and everything lighter than that in white.
2. In the next step, within this area which has the 4 shades, now show the 3rd shade in its color and 4th shade will be as before and everything lighter than that in white.
3. Repeat the above until all darker shades are shown in their respective colors.
4. Then in the subsequent steps, start adding the lighter shades back in, starting from the 5th shade up to the 8th shade.

Look at the tutorials.ts and DrawingReference component to understand the steps but don't re-use anything. Create a completely new implementation for this page.