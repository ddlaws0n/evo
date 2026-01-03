import {
	Bloom,
	EffectComposer,
	TiltShift2,
	Vignette,
} from "@react-three/postprocessing";

/**
 * Effects - Post-processing stack for "Miniature/Toy" aesthetic
 * - TiltShift2: Blurs top/bottom for macro lens miniature effect
 * - Bloom: Soft glow for warm lighting
 * - Vignette: Light corner shading
 */
export function Effects() {
	return (
		<EffectComposer>
			{/* TiltShift - Miniature/diorama depth blur */}
			<TiltShift2 blur={0.05} />

			{/* Bloom - Soft glow on bright areas */}
			<Bloom
				luminanceThreshold={0.9}
				luminanceSmoothing={0.9}
				intensity={0.8}
				mipmapBlur
			/>

			{/* Vignette - Light corner shading */}
			<Vignette offset={0.3} darkness={0.3} eskil={false} />
		</EffectComposer>
	);
}
