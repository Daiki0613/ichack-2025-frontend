"use client";

import { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import ResultDisplay from "../components/ResultDisplay";
import LoadingUI from "../components/LoadingUI";
import { ComparisonResult, ImageCaptionResult, Result } from "./types";

export default function Home() {
  const [caption, setCaption] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File, base64Image: string) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 95) {
            clearInterval(progressInterval);
            return prevProgress;
          }
          return prevProgress + Math.random() * 2;
        });
      }, 1000);

      // First API call
      const response = await fetch("/api/get_caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64_image: base64Image }),
      });

      if (!response.ok) {
        throw new Error("Caption generation failed, with status: " + response.status + " " + response.statusText + ". Base64Img chars: " + base64Image.length);  
      }

      const data = await response.json();
      console.log(data.caption);
      setCaption(data.caption);

      // Second API call
      const response2 = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ caption: data.caption }),
      });

      if (!response2.ok) {
        throw new Error("Upload failed");
      }

      const data2: ImageCaptionResult[] = (await response2.json()).results;

      console.log(data2);
      // Third API call
      const results: Result[] = await Promise.all(
        data2.map(async (result) => {
          if (!result.imageUrl) {
            return result;
          }
          try {
            const response3 = await fetch("/api/get_comparison", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                targetImagePath: base64Image,
                foundImagePath: result.imageUrl,
              }),
            });

            const data3: ComparisonResult = (await response3.json()).result;
            console.log("data3", data3);
            return {
              ...result,
              ...data3,
            };
          } catch (err) {
            console.error("Comparison failed for image:", result.imageUrl, err);
            return result; // Return the original result without comparison data if the API call fails
          }
        })
      );
      console.log(results);

      setResults(results);
      // Clear interval and set to 100%
      clearInterval(progressInterval);
      setProgress(100);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Error: ${errorMessage}`);
      console.error("Image processing failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">AI Image Analyzer</h1>
      <ImageUploader onUpload={handleUpload} />
      {isLoading && <LoadingUI progress={progress} />}
      {error && (
        <div className="max-w-md mx-auto mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {results && <ResultDisplay results={results} />}
    </main>
  );
}
