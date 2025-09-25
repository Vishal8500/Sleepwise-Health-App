import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TipFeedbackProps {
  tipId?: string;
  onFeedbackSubmitted?: () => void;
}

export const TipFeedback = ({ tipId, onFeedbackSubmitted }: TipFeedbackProps) => {
  const [followed, setFollowed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to provide feedback.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("tip_feedback").insert([{
        user_id: user.id,
        followed,
        acknowledged,
      }]);

      if (error) {
        toast({
          title: "Failed to save feedback",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsSubmitted(true);
        toast({
          title: "Feedback submitted! 📝",
          description: "Thank you for helping us improve your experience.",
        });
        
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
      }
    } catch (error) {
      toast({
        title: "Failed to save feedback",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="sleep-card">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Thank You!</h3>
          <p className="text-sm text-muted-foreground">
            Your feedback helps us provide better sleep coaching.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sleep-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-primary" />
          How was this tip?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="acknowledged"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            />
            <label 
              htmlFor="acknowledged" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I found this tip helpful and relevant
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="followed"
              checked={followed}
              onCheckedChange={(checked) => setFollowed(checked as boolean)}
            />
            <label 
              htmlFor="followed" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I plan to follow this tip
            </label>
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};