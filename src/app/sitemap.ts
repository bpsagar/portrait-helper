import type { MetadataRoute } from 'next';
import { tutorials, convertTutorialToSteps } from '@/data/tutorials';

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {

    const staticRoutes = [
        {
            url: 'https://portrait.coach',
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 1,
        },
    ];

    const dynamicRoutes = tutorials
        .map((tutorial) => {
            const steps = convertTutorialToSteps(tutorial);
            return steps.map((_, index) => ({
                url: `https://portrait.coach/draw/${tutorial.slug}/${index + 1}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.6,
            }));
        })
        .flat();

    return [...staticRoutes, ...dynamicRoutes] as MetadataRoute.Sitemap;
}
