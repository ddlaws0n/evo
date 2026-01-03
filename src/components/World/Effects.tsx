import {
	Bloom,
	EffectComposer,
	TiltShift2,
	Vignette,
} from "@react-three/postprocessing";

/**
 * Effects - Post-processing stack for "microscope" aesthetic
 * - Bloom: Makes emissive Food glow softly
 * - TiltShift2: Blurs top/bottom for miniature scale feel
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

			{/* TiltShift - Miniature/microscope depth effect */}
			<TiltShift2 blur={0.15} taper={0.3} start={[0.5, 0.3]} end={[0.5, 0.7]} />

			{/* Vignette - Subtle corner darkening */}
			<Vignette offset={0.3} darkness={0.4} eskil={false} />
		</EffectComposer>
	);
}
