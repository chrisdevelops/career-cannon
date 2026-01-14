import { createFileRoute, Link } from '@tanstack/react-router';
import { IconFileText, IconMail, IconDatabase } from '@tabler/icons-react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Career Cannon</h1>
          <p className="text-lg text-muted-foreground mb-12">
            Your professional knowledge base for AI-powered resumes and cover letters
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/generate/resume"
              className="flex flex-col items-center gap-4 p-8 border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <IconFileText className="w-12 h-12 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Generate Resume</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a tailored resume for any job
                </p>
              </div>
            </Link>

            <Link
              to="/generate/cover-letter"
              className="flex flex-col items-center gap-4 p-8 border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <IconMail className="w-12 h-12 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Generate Cover Letter</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Write personalized cover letters
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-12 pt-12 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Coming soon: Knowledge Base Editor
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <IconDatabase className="w-5 h-5" />
              <span>Manage your professional history</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
