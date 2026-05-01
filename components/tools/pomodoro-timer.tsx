"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PomodoroReminder } from "./pomodoro-reminder"
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

interface PomodoroTimerProps {
  onComplete?: () => void
}

// Custom break tips
const breakTips = [
  {
    title: "Ridică-te de pe scaun",
    description: "Statul prelungit poate afecta circulația. Ridică-te și fă câțiva pași pentru a-ți reactiva mușchii.",
  },
  {
    title: "Privește în depărtare",
    description:
      "Privitul îndelungat la ecran obosește ochii. Privește în depărtare timp de 20 de secunde pentru a reduce oboseala oculară.",
  },
  {
    title: "Exerciții pentru ochi",
    description: "Rotește ochii în sensul acelor de ceasornic, apoi invers, de câteva ori pentru a-i relaxa.",
  },
  {
    title: "Întinde-ți corpul",
    description: "Ridică mâinile deasupra capului și întinde-ți corpul pentru a reduce tensiunea din mușchi.",
  },
  {
    title: "Respiră profund",
    description: "Ia 5 respirații profunde pentru a oxigena creierul și a reduce stresul.",
  },
]

// Flip Clock Digit component
const FlipClockDigit = ({ digit, prevDigit }: { digit: string; prevDigit: string }) => {
  return (
    <div className="relative w-16 h-24 mx-1 overflow-hidden rounded-md bg-background border-2 border-accent/20">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={digit}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
        >
          {digit}
        </motion.div>
      </AnimatePresence>
      <div className="absolute w-full h-[1px] top-1/2 bg-accent/20"></div>
    </div>
  )
}

export function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [activeTab, setActiveTab] = useState("focus")
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [prevTimeLeft, setPrevTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [reminderMessage, setReminderMessage] = useState("")
  const [completedCycles, setCompletedCycles] = useState(0)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [currentTip, setCurrentTip] = useState(breakTips[0])

  // Custom duration settings
  const [focusDuration, setFocusDuration] = useState(25)
  const [shortBreakDuration, setShortBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (user?.user) {
          const { data } = await supabase
            .from("user_settings")
            .select("focus_duration, short_break_duration, long_break_duration")
            .eq("user_id", user.user.id)
            .single()

          if (data) {
            setFocusDuration(data.focus_duration || 25)
            setShortBreakDuration(data.short_break_duration || 5)
            setLongBreakDuration(data.long_break_duration || 15)

            // Update current timer if needed
            if (activeTab === "focus") {
              setTimeLeft(data.focus_duration * 60)
              setPrevTimeLeft(data.focus_duration * 60)
            } else if (activeTab === "shortBreak") {
              setTimeLeft(data.short_break_duration * 60)
              setPrevTimeLeft(data.short_break_duration * 60)
            } else if (activeTab === "longBreak") {
              setTimeLeft(data.long_break_duration * 60)
              setPrevTimeLeft(data.long_break_duration * 60)
            }
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }

    loadSettings()
  }, [supabase])

  // Initialize audio on component mount
  useEffect(() => {
    audioRef.current = new Audio("/sounds/bell.mp3")
    audioRef.current.volume = volume / 100

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Handle tab changes
  useEffect(() => {
    if (activeTab === "focus") {
      setPrevTimeLeft(timeLeft)
      setTimeLeft(focusDuration * 60) // Use custom focus duration
    } else if (activeTab === "shortBreak") {
      setPrevTimeLeft(timeLeft)
      setTimeLeft(shortBreakDuration * 60) // Use custom short break duration
    } else if (activeTab === "longBreak") {
      setPrevTimeLeft(timeLeft)
      setTimeLeft(longBreakDuration * 60) // Use custom long break duration
    }

    // Reset timer
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [activeTab, focusDuration, shortBreakDuration, longBreakDuration])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setPrevTimeLeft(timeLeft)
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            setIsRunning(false)

            // Play sound
            try {
              if (audioRef.current && !isMuted) {
                audioRef.current.currentTime = 0
                audioRef.current.play().catch((error) => {
                  console.error("Error playing sound:", error)
                })
              }
            } catch (error) {
              console.error("Error playing sound:", error)
            }

            // Select a random tip for break
            const randomTip = breakTips[Math.floor(Math.random() * breakTips.length)]
            setCurrentTip(randomTip)

            // Show reminder if break is starting or ending
            if (activeTab === "focus") {
              setReminderMessage(`Timpul de concentrare s-a terminat! ${randomTip.title}: ${randomTip.description}`)
              setShowReminder(true)
              // Auto switch to short break
              setActiveTab("shortBreak")
              // Increment completed cycles
              setCompletedCycles((prev) => prev + 1)

              // Record pomodoro completion
              recordPomodoroCompletion()

              // Check if session is completed (4 cycles)
              if (completedCycles >= 3) {
                setSessionCompleted(true)
              }
            } else if (activeTab === "shortBreak" || activeTab === "longBreak") {
              setReminderMessage("Pauza s-a terminat! Ești pregătit să te concentrezi din nou?")
              setShowReminder(true)
              // Auto switch to focus
              setActiveTab("focus")
            }

            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (!isRunning && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRunning, activeTab, isMuted, completedCycles, timeLeft])

  const toggleTimer = () => {
    setIsRunning((prev) => !prev)
  }

  const resetTimer = () => {
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setPrevTimeLeft(timeLeft)
    if (activeTab === "focus") {
      setTimeLeft(focusDuration * 60)
    } else if (activeTab === "shortBreak") {
      setTimeLeft(shortBreakDuration * 60)
    } else if (activeTab === "longBreak") {
      setTimeLeft(longBreakDuration * 60)
    }
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      minuteTens: Math.floor(mins / 10).toString(),
      minuteOnes: (mins % 10).toString(),
      secondTens: Math.floor(secs / 10).toString(),
      secondOnes: (secs % 10).toString(),
    }
  }

  const formattedTime = formatTime(timeLeft)
  const formattedPrevTime = formatTime(prevTimeLeft)

  const handleComplete = () => {
    if (onComplete) {
      onComplete()
    }
    setSessionCompleted(false)
    setCompletedCycles(0)
  }

  const saveSettings = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.user.id)
        .single()

      if (existingSettings) {
        // Update existing settings
        await supabase
          .from("user_settings")
          .update({
            focus_duration: focusDuration,
            short_break_duration: shortBreakDuration,
            long_break_duration: longBreakDuration,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.user.id)
      } else {
        // Insert new settings
        await supabase.from("user_settings").insert({
          user_id: user.user.id,
          focus_duration: focusDuration,
          short_break_duration: shortBreakDuration,
          long_break_duration: longBreakDuration,
        })
      }

      toast({
        title: "Setări salvate",
        description: "Duratele timer-ului au fost actualizate cu succes.",
      })

      setSettingsOpen(false)

      // Reset current timer based on active tab
      resetTimer()
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut salva setările. Încearcă din nou.",
        variant: "destructive",
      })
    }
  }

  const recordPomodoroCompletion = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return

      // Record method usage for badges
      const { data: existingUsage } = await supabase
        .from("method_usage")
        .select("id, count")
        .eq("user_id", user.user.id)
        .eq("method", "pomodoro")
        .single()

      if (existingUsage) {
        const newCount = existingUsage.count + 1
        await supabase
          .from("method_usage")
          .update({ count: newCount, last_used: new Date().toISOString() })
          .eq("id", existingUsage.id)

        // Check if this completion unlocks a badge
        if (newCount === 10) {
          // Pomodoro Master badge unlocked
          toast({
            title: "Insignă deblocată!",
            description: "Ai deblocat insigna 'Maestru Pomodoro'!",
            action: (
              <Button variant="outline" size="sm" onClick={() => showBadgeUnlockPopup("pomodoro_master")}>
                Vezi
              </Button>
            ),
          })
        }
      } else {
        await supabase.from("method_usage").insert({
          user_id: user.user.id,
          method: "pomodoro",
          count: 1,
          last_used: new Date().toISOString(),
        })
      }

      // Record activity
      await supabase.from("user_activity").insert({
        user_id: user.user.id,
        activity_type: "pomodoro",
        points: 10,
        description: "Pomodoro completat",
      })
    } catch (error) {
      console.error("Error recording pomodoro completion:", error)
    }
  }

  const showBadgeUnlockPopup = (badgeId: string) => {
    // This will be implemented in the badge unlock component
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="w-full max-w-md mx-auto border-2 dark:border-zinc-800 transition-all hover:shadow-md">
          <CardHeader className="relative">
            <CardTitle className="text-center">Pomodoro Timer</CardTitle>
            <CardDescription className="text-center">
              Folosește tehnica Pomodoro pentru a-ți îmbunătăți concentrarea și productivitatea
            </CardDescription>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 transition-all hover:bg-accent/10"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Setări Pomodoro</DialogTitle>
                  <DialogDescription>
                    Personalizează duratele pentru sesiunile de concentrare și pauze.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="focusDuration" className="text-right">
                      Concentrare
                    </Label>
                    <Input
                      id="focusDuration"
                      type="number"
                      min="1"
                      max="60"
                      value={focusDuration}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          setFocusDuration(0) // Allow empty value temporarily
                        } else {
                          setFocusDuration(Number.parseInt(value) || 25)
                        }
                      }}
                      onBlur={() => {
                        // When focus is lost, if value is 0, reset to default
                        if (focusDuration === 0) setFocusDuration(25)
                      }}
                      className="col-span-2"
                    />
                    <span className="text-sm text-muted-foreground">minute</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="shortBreakDuration" className="text-right">
                      Pauză scurtă
                    </Label>
                    <Input
                      id="shortBreakDuration"
                      type="number"
                      min="1"
                      max="30"
                      value={shortBreakDuration}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          setShortBreakDuration(0) // Allow empty value temporarily
                        } else {
                          setShortBreakDuration(Number.parseInt(value) || 5)
                        }
                      }}
                      onBlur={() => {
                        // When focus is lost, if value is 0, reset to default
                        if (shortBreakDuration === 0) setShortBreakDuration(5)
                      }}
                      className="col-span-2"
                    />
                    <span className="text-sm text-muted-foreground">minute</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="longBreakDuration" className="text-right">
                      Pauză lungă
                    </Label>
                    <Input
                      id="longBreakDuration"
                      type="number"
                      min="1"
                      max="60"
                      value={longBreakDuration}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          setLongBreakDuration(0) // Allow empty value temporarily
                        } else {
                          setLongBreakDuration(Number.parseInt(value) || 15)
                        }
                      }}
                      onBlur={() => {
                        // When focus is lost, if value is 0, reset to default
                        if (longBreakDuration === 0) setLongBreakDuration(15)
                      }}
                      className="col-span-2"
                    />
                    <span className="text-sm text-muted-foreground">minute</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                    Anulează
                  </Button>
                  <Button onClick={saveSettings}>Salvează</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="focus" className="transition-all hover:bg-accent/20">
                  Concentrare
                </TabsTrigger>
                <TabsTrigger value="shortBreak" className="transition-all hover:bg-accent/20">
                  Pauză scurtă
                </TabsTrigger>
                <TabsTrigger value="longBreak" className="transition-all hover:bg-accent/20">
                  Pauză lungă
                </TabsTrigger>
              </TabsList>
              <TabsContent value="focus" className="mt-4">
                <div className="flex flex-col items-center">
                  <div className="flex justify-center my-8">
                    <FlipClockDigit digit={formattedTime.minuteTens} prevDigit={formattedPrevTime.minuteTens} />
                    <FlipClockDigit digit={formattedTime.minuteOnes} prevDigit={formattedPrevTime.minuteOnes} />
                    <div className="flex items-center mx-1 text-4xl font-bold">:</div>
                    <FlipClockDigit digit={formattedTime.secondTens} prevDigit={formattedPrevTime.secondTens} />
                    <FlipClockDigit digit={formattedTime.secondOnes} prevDigit={formattedPrevTime.secondOnes} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="shortBreak" className="mt-4">
                <div className="flex flex-col items-center">
                  <div className="flex justify-center my-8">
                    <FlipClockDigit digit={formattedTime.minuteTens} prevDigit={formattedPrevTime.minuteTens} />
                    <FlipClockDigit digit={formattedTime.minuteOnes} prevDigit={formattedPrevTime.minuteOnes} />
                    <div className="flex items-center mx-1 text-4xl font-bold">:</div>
                    <FlipClockDigit digit={formattedTime.secondTens} prevDigit={formattedPrevTime.secondTens} />
                    <FlipClockDigit digit={formattedTime.secondOnes} prevDigit={formattedPrevTime.secondOnes} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="longBreak" className="mt-4">
                <div className="flex flex-col items-center">
                  <div className="flex justify-center my-8">
                    <FlipClockDigit digit={formattedTime.minuteTens} prevDigit={formattedPrevTime.minuteTens} />
                    <FlipClockDigit digit={formattedTime.minuteOnes} prevDigit={formattedPrevTime.minuteOnes} />
                    <div className="flex items-center mx-1 text-4xl font-bold">:</div>
                    <FlipClockDigit digit={formattedTime.secondTens} prevDigit={formattedPrevTime.secondTens} />
                    <FlipClockDigit digit={formattedTime.secondOnes} prevDigit={formattedPrevTime.secondOnes} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center space-x-4 mt-6">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={toggleTimer}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 transition-all hover:border-accent hover:bg-accent/10"
                >
                  {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 transition-all hover:border-accent hover:bg-accent/10"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-all hover:bg-accent/10"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                disabled={isMuted}
                className="flex-1"
              />
            </div>

            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cicluri completate:</span>
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`h-2 w-2 rounded-full ${i < completedCycles ? "bg-accent" : "bg-muted"}`}
                      animate={i < completedCycles ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: 0 }}
                    ></motion.div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {activeTab === "focus"
                ? `Concentrează-te pe sarcina ta pentru ${focusDuration} minute.`
                : activeTab === "shortBreak"
                  ? `Ia o pauză scurtă de ${shortBreakDuration} minute. Ridică-te și privește în depărtare!`
                  : `Ia o pauză lungă de ${longBreakDuration} minute. Mișcă-te și relaxează-ți ochii!`}
            </p>
            {sessionCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <Button
                  onClick={handleComplete}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalizează sesiunea
                </Button>
              </motion.div>
            )}
          </CardFooter>
        </Card>
      </motion.div>

      <PomodoroReminder
        open={showReminder}
        onOpenChange={setShowReminder}
        isBreak={activeTab !== "focus"}
        breakDuration={activeTab === "shortBreak" ? shortBreakDuration : longBreakDuration}
        message={reminderMessage}
        currentTip={currentTip}
      />
    </>
  )
}
