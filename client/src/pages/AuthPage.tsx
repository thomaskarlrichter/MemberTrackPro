import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import QRCode from "qrcode";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export default function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  async function onLogin(data: z.infer<typeof loginSchema>) {
    try {
      const result = await login(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Successfully logged in",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function onRegister(data: z.infer<typeof registerSchema>) {
    try {
      const result = await register(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Successfully registered",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  }

  return (
    <div className="container max-w-md mx-auto min-h-screen flex items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Member Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="lightning">⚡ Lightning</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Register
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="lightning">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Login with Lightning</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan the QR code with your Lightning wallet
                  </p>
                  <div className="flex justify-center">
                    <LightningLogin />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LightningLogin() {
  const [qrCode, setQrCode] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    async function fetchLnurlAuth() {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        
        const response = await fetch("/api/auth/lnurl", {
          signal: abortRef.current.signal
        });
        if (!response.ok) throw new Error("Failed to get LNURL");
        const data = await response.json();
        
        const qr = await QRCode.toDataURL(data.lnurlAuthUrl);
        setQrCode(qr);

        // Start polling for authentication status
        pollRef.current = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/auth/lnurl/status/${data.k1}`);
            const statusData = await statusResponse.json();
            
            if (statusData.authenticated) {
              clearInterval(pollRef.current);
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              toast({
                title: "Success",
                description: "Successfully logged in with Lightning",
                duration: 3000,
              });
            }
          } catch (error) {
            console.error("Polling error:", error);
          }
        }, 2000);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error("LNURL Auth error:", error);
        toast({
          title: "Error",
          description: "Failed to initiate Lightning login",
          variant: "destructive",
        });
      }
    }

    fetchLnurlAuth();
    
    return () => {
      clearInterval(pollRef.current);
      abortRef.current?.abort();
    };
  }, [toast, queryClient]);

  return (
    <div className="p-4 border rounded-lg">
      {qrCode ? (
        <img src={qrCode} alt="Lightning Login QR Code" className="w-64 h-64" />
      ) : (
        <div className="w-64 h-64 flex items-center justify-center">
          <p>Loading QR Code...</p>
        </div>
      )}
    </div>
  );
}
