"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle, Loader2 } from "lucide-react"
import Layout from "@/components/layout"
import ProgressBar from "@/components/progress-bar"
import { toast } from "@/components/ui/use-toast"

// Learning style questions
const questions = [
  {
    id: 1,
    question: "Când învăț ceva nou, prefer să:",
    options: [
      { id: "visual_1", text: "Văd diagrame, grafice sau demonstrații", type: "visual" },
      { id: "auditory_1", text: "Ascult explicații și discuții", type: "auditory" },
      { id: "kinesthetic_1", text: "Încerc practic și învăț făcând", type: "kinesthetic" },
    ],
  },
  {
    id: 2,
    question: "Când citesc, tind să:",
    options: [
      { id: "visual_2", text: "Îmi plac cărțile cu imagini, diagrame și elemente vizuale", type: "visual" },
      { id: "auditory_2", text: "Citesc cu voce tare sau aud cuvintele în mintea mea", type: "auditory" },
      { id: "kinesthetic_2", text: "Prefer povești cu acțiune și mișcare", type: "kinesthetic" },
    ],
  },
  {
    id: 3,
    question: "Când încerc să mă concentrez, îmi este mai ușor când:",
    options: [
      { id: "visual_3", text: "Mediul meu este organizat vizual și ordonat", type: "visual" },
      { id: "auditory_3", text: "Este liniște sau există un zgomot de fond constant", type: "auditory" },
      { id: "kinesthetic_3", text: "Mă pot mișca sau pot manipula ceva", type: "kinesthetic" },
    ],
  },
  {
    id: 4,
    question: "Îmi amintesc cel mai bine lucrurile prin:",
    options: [
      { id: "visual_4", text: "Vizualizarea lor în mintea mea", type: "visual" },
      { id: "auditory_4", text: "Repetarea lor cu voce tare sau în mintea mea", type: "auditory" },
      { id: "kinesthetic_4", text: "Asocierea lor cu mișcări sau acțiuni", type: "kinesthetic" },
    ],
  },
  {
    id: 5,
    question: "Când explic ceva cuiva, tind să:",
    options: [
      { id: "visual_5", text: "Desenez o diagramă sau arăt o imagine", type: "visual" },
      { id: "auditory_5", text: "Explic verbal în detaliu", type: "auditory" },
      { id: "kinesthetic_5", text: "Demonstrez cum funcționează sau folosesc gesturi", type: "kinesthetic" },
    ],
  },
]

export default function Quiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalSteps = questions.length + 1 // Questions + results page
  const router = useRouter()
  const supabase = createClient()

  const handleOptionSelect = (optionType: string) => {
    setSelectedOption(optionType)
  }

  const handleContinue = () => {
    if (selectedOption) {
      setAnswers({ ...answers, [currentStep]: selectedOption })
      setSelectedOption(null)
      setCurrentStep(currentStep + 1)
    }
  }

  const calculateLearningStyle = () => {
    const counts = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
    }

    Object.values(answers).forEach((type) => {
      if (type in counts) {
        counts[type as keyof typeof counts]++
      }
    })

    // Find the learning style with the highest count
    let maxCount = 0
    let learningStyle = ""

    for (const [style, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        learningStyle = style
      }
    }

    return {
      style: learningStyle,
      counts,
    }
  }

  const renderLearningStyleDescription = (style: string) => {
    switch (style) {
      case "visual":
        return {
          title: "Cursant Vizual",
          description:
            "Înveți cel mai bine prin vizualizarea și observarea informațiilor. Graficele, diagramele și instrucțiunile scrise funcționează bine pentru tine.",
          tips: [
            "Folosește codificarea cu culori și evidențierea în notițe",
            "Creează hărți mentale și diagrame",
            "Urmărește demonstrații video",
            "Utilizează carduri flash și ajutoare vizuale",
          ],
        }
      case "auditory":
        return {
          title: "Cursant Auditiv",
          description:
            "Înveți cel mai bine prin ascultare și comunicare verbală. Discuțiile, prelegerile și materialele audio sunt eficiente pentru tine.",
          tips: [
            "Înregistrează prelegerile și ascultă-le din nou",
            "Citește materialul cu voce tare",
            "Participă la discuții de grup",
            "Folosește repetarea verbală pentru a memora informații",
          ],
        }
      case "kinesthetic":
        return {
          title: "Cursant Kinestezic",
          description:
            "Înveți cel mai bine prin activități fizice și experiențe practice. Exercițiile practice și mișcarea te ajută să înțelegi conceptele.",
          tips: [
            "Fă pauze frecvente pentru a te mișca",
            "Folosește obiecte fizice pentru a înțelege concepte",
            "Implică-te în jocuri de rol și simulări",
            "Ia notițe în timp ce stai în picioare sau te plimbi",
          ],
        }
      default:
        return {
          title: "Stil de învățare mixt",
          description: "Ai o abordare echilibrată a învățării, utilizând eficient mai multe stiluri.",
          tips: [
            "Combină abordări vizuale, auditive și practice",
            "Experimentează cu diferite tehnici de învățare",
            "Adaptează-ți abordarea în funcție de subiect",
            "Folosește-ți flexibilitatea ca un avantaj",
          ],
        }
    }
  }

  const saveResultsAndRedirect = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = calculateLearningStyle()
      console.log("Calculated learning style:", result.style)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Nu s-a putut obține utilizatorul curent")
      }

      
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            learning_style: result.style,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
            ignoreDuplicates: false, // we want update on conflict
          },
        )
        // Because RLS may block returning rows, we disable returning
        // to avoid “no rows returned” errors.
        .select("*", { head: true })

      if (upsertError) {
        console.error("Error saving learning style:", upsertError)
        setError("Nu s-a putut salva stilul de învățare. Vă rugăm să încercați din nou.")
        return
      }
      /* ------------------------------------------------------------------ */

      // Show success toast
      toast({
        title: "Stilul de învățare salvat",
        description: `Stilul tău de învățare este ${result.style === "visual" ? "Vizual" : result.style === "auditory" ? "Auditiv" : "Kinestezic"}`,
      })

      // Explicitly redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      setError("A apărut o eroare. Vă rugăm să încercați din nou.")
    } finally {
      setLoading(false)
    }
  }

  const isLastQuestion = currentStep === questions.length - 1
  const isResultPage = currentStep === questions.length

  return (
    <Layout hideNavigation={true}>
      <div className="w-full max-w-3xl mx-auto p-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">NeuroLearn - Stilul tău de învățare</h1>
        </div>

        <Card className="border-2 dark:border-zinc-800">
          <CardContent className="p-6">
            {!isResultPage && (
              <div className="mb-8">
                <ProgressBar currentStep={currentStep} totalSteps={totalSteps - 1} />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {isResultPage ? (
                  <div className="space-y-6">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                      </div>
                    </div>

                    {(() => {
                      const result = calculateLearningStyle()
                      const learningStyleInfo = renderLearningStyleDescription(result.style)

                      return (
                        <>
                          <h2 className="text-2xl font-bold text-center mb-2">
                            Stilul tău de învățare: <span className="text-primary">{learningStyleInfo.title}</span>
                          </h2>
                          <p className="text-center mb-6">{learningStyleInfo.description}</p>

                          {/* Quote added to quiz results */}
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-6">
                            <p className="text-center italic font-medium">
                              "Nu există un singur mod corect de a învăța - există doar modul care ți se potrivește!"
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-8">
                            {Object.entries(result.counts).map(([style, count]) => (
                              <div
                                key={style}
                                className={`p-4 rounded-lg ${
                                  style === result.style ? "bg-primary/10 border-2 border-primary" : "bg-muted"
                                }`}
                              >
                                <div className="text-center">
                                  <h3 className="capitalize font-medium">
                                    {style === "visual" ? "Vizual" : style === "auditory" ? "Auditiv" : "Kinestezic"}
                                  </h3>
                                  <div className="text-2xl font-bold">{count}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-bold mb-2">Sfaturi de învățare:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                              {learningStyleInfo.tips.map((tip, index) => (
                                <li key={index}>{tip}</li>
                              ))}
                            </ul>
                          </div>

                          {error && (
                            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg mt-4">
                              {error}
                            </div>
                          )}

                          <Button
                            className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
                            onClick={saveResultsAndRedirect}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se salvează...
                              </>
                            ) : (
                              "Continuă spre Dashboard"
                            )}
                          </Button>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold mb-6">{questions[currentStep].question}</h2>

                    <div className="space-y-4 mb-8">
                      {questions[currentStep].options.map((option) => (
                        <div
                          key={option.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedOption === option.type
                              ? "border-primary bg-primary/10"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => handleOptionSelect(option.type)}
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                selectedOption === option.type ? "border-primary" : "border-muted-foreground"
                              }`}
                            >
                              {selectedOption === option.type && <div className="w-3 h-3 rounded-full bg-primary" />}
                            </div>
                            <span>{option.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (currentStep > 0) {
                            setCurrentStep(currentStep - 1)
                            setSelectedOption(answers[currentStep - 1] || null)
                          }
                        }}
                        disabled={currentStep === 0}
                      >
                        Înapoi
                      </Button>
                      <Button
                        onClick={handleContinue}
                        disabled={!selectedOption}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {isLastQuestion ? "Vezi rezultatele" : "Continuă"}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
