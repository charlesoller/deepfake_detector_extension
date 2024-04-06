import { HfInference } from "@huggingface/inference"
const hf = new HfInference("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")
export const evalImage = async (blob: Blob) => {
    const res = await hf.imageClassification({
        data: blob,
        model: "dima806/deepfake_vs_real_image_detection" //INSERT MODEL HERE
    })
    return res
}
