import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient"; // Import the API client

const sleepLogSchema = z.object({
  age: z.number().min(1).max(120),
  gender: z.string().min(1),
  sleep_duration: z.number().min(0).max(24),
  stress_level: z.number().min(1).max(10),
  daily_steps: z.number().min(0),
  bmi_category: z.string().min(1),
  blood_pressure: z.string().min(1),
  heart_rate: z.number().min(30).max(220),
  physical_activity: z.number().min(0),
});

export default function DailyLog() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    sleep_duration: "",
    stress_level: [5],
    daily_steps: "",
    bmi_category: "",
    blood_pressure: "",
    heart_rate: "",
    physical_activity: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate input (this part remains the same)
      const validatedData = sleepLogSchema.parse({
        age: parseInt(formData.age),
        gender: formData.gender,
        sleep_duration: parseFloat(formData.sleep_duration),
        stress_level: formData.stress_level[0],
        daily_steps: parseInt(formData.daily_steps),
        bmi_category: formData.bmi_category,
        blood_pressure: formData.blood_pressure,
        heart_rate: parseInt(formData.heart_rate),
        physical_activity: parseInt(formData.physical_activity),
      });

      // Get current user (this client-side check is still useful)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to log your data.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // --- MODIFICATION START ---
      // Replace the direct Supabase call with a call to your backend API
      await apiClient.post('/log', validatedData);
      // --- MODIFICATION END ---

      // Success handling now follows the successful API call
      toast({
        title: "Daily log stored successfully! 🌙",
        description: "Your sleep data has been recorded.",
      });
      
      // Reset form
      setFormData({
        age: "",
        gender: "",
        sleep_duration: "",
        stress_level: [5],
        daily_steps: "",
        bmi_category: "",
        blood_pressure: "",
        heart_rate: "",
        physical_activity: "",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        // This now catches errors from the API call
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
          title: "Failed to save log",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // The entire JSX return block remains unchanged.
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary gentle-pulse">
                <PlusCircle className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Daily Sleep Log
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Track your daily health metrics to get personalized sleep insights and coaching tips.
            </p>
          </div>

          <Card className="sleep-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Log Your Daily Data
              </CardTitle>
              <CardDescription>
                Fill out your health information for today. All fields are required for accurate predictions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Age */}
                  <div className="space-y-2">
                    <Label htmlFor="age" className="flex items-center gap-2">
                      Age
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Your current age in years</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="25"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      className={errors.age ? "border-destructive" : ""}
                      min="1"
                      max="120"
                      required
                    />
                    {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => handleInputChange("gender", value)} value={formData.gender}>
                      <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>

                  {/* Sleep Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="sleep_duration" className="flex items-center gap-2">
                      Sleep Duration (hours)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>How many hours you slept last night</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="sleep_duration"
                      type="number"
                      step="0.5"
                      placeholder="7.5"
                      value={formData.sleep_duration}
                      onChange={(e) => handleInputChange("sleep_duration", e.target.value)}
                      className={errors.sleep_duration ? "border-destructive" : ""}
                      min="0"
                      max="24"
                      required
                    />
                    {errors.sleep_duration && <p className="text-sm text-destructive">{errors.sleep_duration}</p>}
                  </div>

                  {/* Daily Steps */}
                  <div className="space-y-2">
                    <Label htmlFor="daily_steps" className="flex items-center gap-2">
                      Daily Steps
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of steps you took today</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="daily_steps"
                      type="number"
                      placeholder="8000"
                      value={formData.daily_steps}
                      onChange={(e) => handleInputChange("daily_steps", e.target.value)}
                      className={errors.daily_steps ? "border-destructive" : ""}
                      min="0"
                      required
                    />
                    {errors.daily_steps && <p className="text-sm text-destructive">{errors.daily_steps}</p>}
                  </div>

                  {/* BMI Category */}
                  <div className="space-y-2">
                    <Label htmlFor="bmi_category">BMI Category</Label>
                    <Select onValueChange={(value) => handleInputChange("bmi_category", value)} value={formData.bmi_category}>
                      <SelectTrigger className={errors.bmi_category ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select BMI category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Overweight">Overweight</SelectItem>
                        <SelectItem value="Obese">Obese</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.bmi_category && <p className="text-sm text-destructive">{errors.bmi_category}</p>}
                  </div>

                  {/* Blood Pressure */}
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure" className="flex items-center gap-2">
                      Blood Pressure
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Format: 120/80 (systolic/diastolic)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="blood_pressure"
                      type="text"
                      placeholder="120/80"
                      value={formData.blood_pressure}
                      onChange={(e) => handleInputChange("blood_pressure", e.target.value)}
                      className={errors.blood_pressure ? "border-destructive" : ""}
                      pattern="^\d+\/\d+$"
                      required
                    />
                    {errors.blood_pressure && <p className="text-sm text-destructive">{errors.blood_pressure}</p>}
                  </div>

                  {/* Heart Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="heart_rate" className="flex items-center gap-2">
                      Heart Rate (BPM)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Your resting heart rate in beats per minute</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="heart_rate"
                      type="number"
                      placeholder="72"
                      value={formData.heart_rate}
                      onChange={(e) => handleInputChange("heart_rate", e.target.value)}
                      className={errors.heart_rate ? "border-destructive" : ""}
                      min="30"
                      max="220"
                      required
                    />
                    {errors.heart_rate && <p className="text-sm text-destructive">{errors.heart_rate}</p>}
                  </div>

                  {/* Physical Activity */}
                  <div className="space-y-2">
                    <Label htmlFor="physical_activity" className="flex items-center gap-2">
                      Physical Activity (minutes)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Minutes of moderate to vigorous exercise today</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="physical_activity"
                      type="number"
                      placeholder="30"
                      value={formData.physical_activity}
                      onChange={(e) => handleInputChange("physical_activity", e.target.value)}
                      className={errors.physical_activity ? "border-destructive" : ""}
                      min="0"
                      required
                    />
                    {errors.physical_activity && <p className="text-sm text-destructive">{errors.physical_activity}</p>}
                  </div>
                </div>

                {/* Stress Level Slider */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    Stress Level: {formData.stress_level[0]}/10
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rate your stress level from 1 (very low) to 10 (very high)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="px-4">
                    <Slider
                      value={formData.stress_level}
                      onValueChange={(value) => handleInputChange("stress_level", value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>Low Stress</span>
                      <span>High Stress</span>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Your Data...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Log My Day
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}