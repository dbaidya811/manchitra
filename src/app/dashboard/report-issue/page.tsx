
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

export default function ReportIssuePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });
  
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const { name, email } = JSON.parse(userData);
      form.reset({
        name: name || "",
        email: email || "",
        message: "",
      });
    }
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Failed to submit report (${res.status})`);
      }

      toast({
        title: "Report Submitted",
        description: "Thank you! We have received your report and sent a confirmation email.",
      });
      form.reset();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Could not send your report. Please try again later.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4">
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 left-6 z-10"
            onClick={() => router.back()}
            >
            <ArrowLeft className="h-6 w-6" />
        </Button>
      <div className="w-full max-w-2xl">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Report an Issue</CardTitle>
              <CardDescription>
                We appreciate your feedback. Please describe the issue you are facing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the issue in detail"
                            className="resize-none"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting ? "Submitting..." : "Submit Report"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-10 shadow-xl dark:bg-neutral-900">
            <div className="relative">
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-emerald-400/40" style={{ width: 96, height: 96 }} />
              <CheckCircle2 className="h-24 w-24 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Report Submitted</p>
              <p className="text-sm text-muted-foreground">Thanks for helping us improve Manchitra!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
