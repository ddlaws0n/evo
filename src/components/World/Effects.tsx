import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/**
 * Effects - Post-processing stack for "microscope" aesthetic
 * - Bloom: Makes emissive Food glow softly
 * - Vignette: Subtle corner darkening to focus the eye
 */
export function Effects() {
	return (
		<EffectComposer>
			{/* Bloom - Soft glow on emissive materials (Food) */}
			<Bloom
				luminanceThreshold={1}
				luminanceSmoothing={0.9}
				intensity={1.5}
				mipmapBlur
			/>

			{/* Vignette - Subtle corner darkening */}
			<Vignette offset={0.3} darkness={0.4} eskil={false} />
		</EffectComposer>
	);
}
