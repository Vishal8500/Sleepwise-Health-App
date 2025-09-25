import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Moon, Activity, Heart, Target, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";

interface SleepLog {
  id: number;
  created_at: string;
  sleep_duration: number | null;
  predicted_quality: number | null;
  stress_level: number | null;
  daily_steps: number | null;
  top_drivers: any; // Json type from Supabase
}

export default function Dashboard() {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState("7");
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your dashboard.",
          variant: "destructive",
        });
        return;
      }

      // Calculate date range
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      // Fetch sleep logs
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "Failed to load dashboard",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      toast({
        title: "Failed to load dashboard",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  // Prepare chart data
  const chartData = logs.map(log => ({
    date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sleep_hours: log.sleep_duration || 0,
    quality: log.predicted_quality || 0,
    stress: log.stress_level || 0,
    steps: Math.round((log.daily_steps || 0) / 1000), // Convert to thousands
  }));

  // Calculate averages
  const averages = logs.reduce((acc, log) => ({
    sleep: acc.sleep + (log.sleep_duration || 0),
    quality: acc.quality + (log.predicted_quality || 0),
    stress: acc.stress + (log.stress_level || 0),
    steps: acc.steps + (log.daily_steps || 0),
  }), { sleep: 0, quality: 0, stress: 0, steps: 0 });

  const logCount = logs.length;
  if (logCount > 0) {
    averages.sleep = Math.round((averages.sleep / logCount) * 10) / 10;
    averages.quality = Math.round((averages.quality / logCount) * 10) / 10;
    averages.stress = Math.round(averages.stress / logCount);
    averages.steps = Math.round(averages.steps / logCount);
  }

  // Get top drivers frequency
  const driverCounts: { [key: string]: number } = {};
  logs.forEach(log => {
    if (log.top_drivers && Array.isArray(log.top_drivers)) {
      log.top_drivers.forEach((driver: string) => {
        driverCounts[driver] = (driverCounts[driver] || 0) + 1;
      });
    }
  });

  const topDrivers = Object.entries(driverCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([driver, count]) => ({ driver, count }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary gentle-pulse">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sleep Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground">
                Track your sleep patterns and wellness metrics over time
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading your sleep data...</span>
            </div>
          ) : logCount === 0 ? (
            <Card className="sleep-card text-center py-12">
              <CardContent>
                <Moon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Sleep Data Yet</h2>
                <p className="text-muted-foreground mb-6">
                  Start logging your daily sleep data to see beautiful insights here.
                </p>
                <Button asChild>
                  <a href="/log">Log Your First Day</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="sleep-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Moon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Sleep</p>
                        <p className="text-2xl font-bold">{averages.sleep}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="sleep-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Quality</p>
                        <p className="text-2xl font-bold">{averages.quality}/10</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="sleep-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <Heart className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Stress</p>
                        <p className="text-2xl font-bold">{averages.stress}/10</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="sleep-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <Activity className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Steps</p>
                        <p className="text-2xl font-bold">{averages.steps.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sleep Trends */}
                <Card className="sleep-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Sleep & Quality Trends
                    </CardTitle>
                    <CardDescription>
                      Your sleep duration and quality scores over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sleep_hours" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Sleep Hours"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="quality" 
                            stroke="hsl(var(--secondary))" 
                            strokeWidth={2}
                            name="Quality Score"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Stress & Activity */}
                <Card className="sleep-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-warning" />
                      Stress & Activity Levels
                    </CardTitle>
                    <CardDescription>
                      Your stress levels and daily steps (in thousands)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="stress" 
                            stroke="hsl(var(--warning))" 
                            strokeWidth={2}
                            name="Stress Level"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="steps" 
                            stroke="hsl(var(--success))" 
                            strokeWidth={2}
                            name="Steps (K)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Drivers */}
              {topDrivers.length > 0 && (
                <Card className="sleep-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-accent" />
                      Top Sleep Factors
                    </CardTitle>
                    <CardDescription>
                      The most common factors affecting your sleep
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topDrivers.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{item.driver}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${(item.count / logCount) * 100}%` }}
                              />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.count}x
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}