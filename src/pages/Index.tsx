import { UserCircle, GraduationCap, BookOpen, BookMarked, BookText, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Floating book animation component
const FloatingBook = ({ icon: Icon, delay = 0, className = "" }) => {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{
        y: [0, -15, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={cn("absolute text-primary/20 z-0", className)}
    >
      <Icon className="h-16 w-16" />
    </motion.div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <FloatingBook icon={BookOpen} delay={0} className="top-1/4 left-[10%]" />
        <FloatingBook icon={BookMarked} delay={0.5} className="top-1/3 right-[15%]" />
        <FloatingBook icon={BookText} delay={0.3} className="bottom-1/4 left-[20%]" />
        <FloatingBook icon={BookOpenCheck} delay={0.7} className="bottom-1/3 right-[10%]" />
      </div>

      <Header title="Kids Paradise School Library" />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
        <motion.div 
          className="w-full max-w-6xl mx-auto text-center space-y-8 relative z-10"
          variants={container}
          initial="hidden"
          animate={isMounted ? "show" : "hidden"}
        >
          <motion.div variants={item} className="space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block"
            >
              <img 
                src="/logo.png" 
                alt="Kids Paradise School Logo" 
                className="h-28 w-28 md:h-32 md:w-32 mx-auto object-contain drop-shadow-lg hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.h2 
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Welcome to Our Library!
            </motion.h2>
            <motion.p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Embark on a magical journey through the world of books and imagination!
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 gap-6 mt-12"
            variants={container}
          >
            <motion.div variants={item}>
              <Card className="h-full p-6 md:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border border-gray-100/50">
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-primary/10">
                    <UserCircle className="h-12 w-12 text-primary" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800">Admin Portal</CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Manage the library's collection and operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="lg" 
                    className="w-full text-lg py-6 gap-2 group"
                    onClick={() => navigate("/admin/login")}
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      <UserCircle className="h-5 w-5" />
                    </span>
                    Enter Admin Portal
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full p-6 md:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border border-gray-100/50">
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-accent/10">
                    <GraduationCap className="h-12 w-12 text-accent" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800">Student Portal</CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Explore books and track your reading journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full text-lg py-6 gap-2 border-2 border-accent text-accent hover:bg-accent hover:text-white transition-colors group"
                    onClick={() => navigate("/student/login")}
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    Enter Student Portal
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div 
            className="mt-12 p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl border border-gray-200 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-lg font-medium text-gray-700">
              <span className="text-2xl mr-2">✨</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-semibold">
                Did you know?
              </span>{' '}
              Reading for just 20 minutes a day exposes you to about 1.8 million words per year!
              <span className="text-2xl ml-2">📖</span>
            </p>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
