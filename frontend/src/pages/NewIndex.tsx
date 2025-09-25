import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Brain, BarChart3, PlusCircle, CheckCircle, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import heroImage from "@/assets/hero-sleep.jpg";

export default function NewIndex() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get current user session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setIsLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: PlusCircle,
      title: "Daily Sleep Logging",
      description: "Track your sleep patterns, stress levels, and health metrics with our intuitive daily log form.",
      color: "text-primary"
    },
    {
      icon: Brain,
      title: "AI Sleep Analysis",
      description: "Get personalized sleep quality predictions and disorder risk assessments powered by advanced AI.",
      color: "text-secondary"
    },
    {
      icon: BarChart3,
      title: "Beautiful Analytics",
      description: "Visualize your sleep trends with stunning charts and gain insights from 7, 14, or 30-day views.",
      color: "text-accent"
    }
  ];

  const benefits = [
    "Improve sleep quality with personalized coaching",
    "Track trends and patterns over time", 
    "Get AI-powered insights and predictions",
    "Simple, privacy-focused design",
    "Mobile-friendly responsive interface"
  ];

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center min-h-screen">Loading...</div></Layout>;
  }

  return (
    <Layout user={user}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto px-4 py-20 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary gentle-pulse">
                    <Moon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium text-primary">SleepWise Coach</span>
                </div>
                
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                  Better Sleep,
                  <br />
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    Better Life
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Transform your sleep wellness journey with AI-powered insights, personalized coaching, 
                  and beautiful analytics. Track, analyze, and improve your sleep quality naturally.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  {user ? (
                    <>
                      <Button size="lg" className="text-lg px-8" asChild>
                        <Link to="/dashboard">View Dashboard</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                        <Link to="/log">Log Today's Sleep</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="lg" className="text-lg px-8" asChild>
                        <Link to="/signup">Start Free Today</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                        <Link to="/login">Sign In</Link>
                      </Button>
                    </>
                  )}
                </div>

                {/* Benefits List */}
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Hero Image */}
              <div className="animate-slide-up">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl transform rotate-3"></div>
                  <img 
                    src={heroImage}
                    alt="Peaceful sleep wellness illustration"
                    className="relative rounded-3xl shadow-[var(--shadow-floating)] w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Comprehensive Sleep Wellness Platform
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to understand and improve your sleep, backed by science and powered by AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="sleep-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardContent className="pt-6">
                    <div className={`inline-flex p-3 rounded-xl bg-muted/50 ${feature.color} mb-4`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                How SleepWise Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Simple steps to transform your sleep wellness journey
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Log Your Data",
                  description: "Record daily sleep metrics, stress levels, and health information in seconds.",
                  icon: PlusCircle
                },
                {
                  step: "2", 
                  title: "Get AI Insights",
                  description: "Receive personalized sleep quality predictions and coaching recommendations.",
                  icon: Brain
                },
                {
                  step: "3",
                  title: "Track Progress",
                  description: "Monitor trends and improvements with beautiful charts and analytics.",
                  icon: BarChart3
                }
              ].map((item, index) => (
                <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <div className="relative mb-6">
                    <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center gentle-pulse">
                      <item.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-sm font-bold text-secondary-foreground">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Privacy-First & Secure</span>
                </div>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Ready to Transform Your Sleep?
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of users who have improved their sleep quality with SleepWise Coach. 
                Start your wellness journey today.
              </p>

              {user ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="text-lg px-8" asChild>
                    <Link to="/log">
                      <Zap className="mr-2 h-5 w-5" />
                      Log Your Sleep Now
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                    <Link to="/predict">
                      <Brain className="mr-2 h-5 w-5" />
                      Get AI Analysis
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="text-lg px-8" asChild>
                    <Link to="/signup">
                      <Zap className="mr-2 h-5 w-5" />
                      Get Started Free
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                    <Link to="/login">Already have an account?</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}