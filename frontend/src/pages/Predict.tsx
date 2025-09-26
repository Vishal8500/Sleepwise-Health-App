import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient"; // Import the API client

const predictionSchema = z.object({
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

// Update interface to match the backend's PredictResponse schema
interface PredictionResult {
  predicted_quality: number;
  disorder_risk: string; // Renamed from predicted_disorder
  top_drivers: string[];
  coach_tip: string;
  confidence: string;
  rule_override_flag: boolean;
}


export default function Predict() {
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
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setPrediction(null);

    try {
      // Validate input (remains the same)
      const validatedData = predictionSchema.parse({
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

      // Get current user (remains the same)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to get predictions.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Replace the entire mock prediction block with a live API call
      const result = await apiClient.post<PredictionResult>('/predict', validatedData);
      setPrediction(result);

      toast({
        title: "Prediction generated! 🧠",
        description: "Your sleep analysis is ready.",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
          title: "Failed to generate prediction",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 8) return "text-success";
    if (quality >= 6) return "text-warning";
    return "text-destructive";
  };

  const handleInputChange = (field: string, value: string | number[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary gentle-pulse">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sleep Prediction & Coaching
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Get AI-powered insights about your sleep quality and personalized coaching tips.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form (JSX remains the same) */}
            <Card className="sleep-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Health Data Input
                </CardTitle>
                <CardDescription>
                  Enter your current health metrics to get personalized sleep insights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age */}
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="25"
                        value={formData.age}
                        onChange={(e) => handleInputChange("age", e.target.value)}
                        className={errors.age ? "border-destructive" : ""}
                        required
                      />
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select onValueChange={(value) => handleInputChange("gender", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sleep Duration */}
                    <div className="space-y-2">
                      <Label htmlFor="sleep_duration">Sleep Hours</Label>
                      <Input
                        id="sleep_duration"
                        type="number"
                        step="0.5"
                        placeholder="7.5"
                        value={formData.sleep_duration}
                        onChange={(e) => handleInputChange("sleep_duration", e.target.value)}
                        required
                      />
                    </div>

                    {/* Daily Steps */}
                    <div className="space-y-2">
                      <Label htmlFor="daily_steps">Daily Steps</Label>
                      <Input
                        id="daily_steps"
                        type="number"
                        placeholder="8000"
                        value={formData.daily_steps}
                        onChange={(e) => handleInputChange("daily_steps", e.target.value)}
                        required
                      />
                    </div>

                    {/* BMI Category */}
                    <div className="space-y-2">
                      <Label>BMI Category</Label>
                      <Select onValueChange={(value) => handleInputChange("bmi_category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Overweight">Overweight</SelectItem>
                          <SelectItem value="Obese">Obese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Blood Pressure */}
                    <div className="space-y-2">
                      <Label htmlFor="blood_pressure">Blood Pressure</Label>
                      <Input
                        id="blood_pressure"
                        placeholder="120/80"
                        value={formData.blood_pressure}
                        onChange={(e) => handleInputChange("blood_pressure", e.target.value)}
                        required
                      />
                    </div>

                    {/* Heart Rate */}
                    <div className="space-y-2">
                      <Label htmlFor="heart_rate">Heart Rate (BPM)</Label>
                      <Input
                        id="heart_rate"
                        type="number"
                        placeholder="72"
                        value={formData.heart_rate}
                        onChange={(e) => handleInputChange("heart_rate", e.target.value)}
                        required
                      />
                    </div>

                    {/* Physical Activity */}
                    <div className="space-y-2">
                      <Label htmlFor="physical_activity">Exercise (min)</Label>
                      <Input
                        id="physical_activity"
                        type="number"
                        placeholder="30"
                        value={formData.physical_activity}
                        onChange={(e) => handleInputChange("physical_activity", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Stress Level Slider */}
                  <div className="space-y-3">
                    <Label>Stress Level: {formData.stress_level[0]}/10</Label>
                    <Slider
                      value={formData.stress_level}
                      onValueChange={(value) => handleInputChange("stress_level", value)}
                      max={10}
                      min={1}
                      step={1}
                    />
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
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-5 w-5" />
                        Get My Sleep Analysis
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Prediction Results */}
            {prediction && (
              <div className="space-y-6 animate-slide-up">
                {/* Quality Score */}
                <Card className="sleep-card">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Sleep Quality Score</h3>
                      </div>
                      <div className={`text-4xl font-bold ${getQualityColor(prediction.predicted_quality)} mb-2`}>
                        {prediction.predicted_quality}/10
                      </div>
                      <Badge variant={getConfidenceBadgeVariant(prediction.confidence)}>
                        {prediction.confidence} confidence
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Disorder Risk */}
                <Card className="sleep-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      {/* Update property name from predicted_disorder to disorder_risk */}
                      {prediction.disorder_risk === "None" ? (
                        <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      )}
                      <div>
                        <h3 className="font-semibold mb-1">Sleep Assessment</h3>
                        <p className="text-sm text-muted-foreground">
                          {prediction.disorder_risk === "None" 
                            ? "No sleep disorders detected. Great job!"
                            : `Potential concern: ${prediction.disorder_risk}`
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Drivers */}
                <Card className="sleep-card">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Key Factors
                    </h3>
                    <ul className="space-y-2">
                      {prediction.top_drivers.map((driver, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          {driver}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Coach Tip */}
                <Card className="sleep-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-secondary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-2">Personalized Tip</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {prediction.coach_tip}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Warning if applicable */}
                {prediction.rule_override_flag && (
                  <Card className="sleep-card border-warning">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-warning mb-1">Important Notice</h3>
                          <p className="text-sm text-muted-foreground">
                            Your metrics indicate significant sleep concerns. Consider consulting with a healthcare provider.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

