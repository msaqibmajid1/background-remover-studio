import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to the Image Editor!',
    description: 'Let\'s take a quick tour of the main features. This will only take a minute.',
  },
  {
    title: 'Upload Your Image',
    description: 'Click the "Choose Image" button to upload an image you want to edit.',
    target: '[data-onboarding="upload-image"]',
    position: 'bottom',
  },
  {
    title: 'Add Text',
    description: 'Use the text tool in the left panel to add text to your image. You can customize font, size, and color.',
    target: '[data-onboarding="add-text"]',
    position: 'right',
  },
  {
    title: 'Add Shapes',
    description: 'Add rectangles, circles, and other shapes from the left panel to enhance your design.',
    target: '[data-onboarding="add-shapes"]',
    position: 'right',
  },
  {
    title: 'Element Properties',
    description: 'Select any element to edit its properties like position, size, colors, and effects in the right panel.',
    target: '[data-onboarding="properties"]',
    position: 'left',
  },
  {
    title: 'Image Filters',
    description: 'Apply filters like brightness, contrast, blur, and more to your images using the properties panel.',
    target: '[data-onboarding="properties"]',
    position: 'left',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Use shortcuts like Ctrl+C (copy), Ctrl+V (paste), Delete, and arrow keys for faster editing. Click the keyboard icon to see all shortcuts.',
    target: '[data-onboarding="shortcuts"]',
    position: 'bottom',
  },
  {
    title: 'Export Your Work',
    description: 'When you\'re done, export your creation as PNG or JPG from the top menu.',
    target: '[data-onboarding="export"]',
    position: 'bottom',
  },
  {
    title: 'You\'re All Set!',
    description: 'You can restart this tutorial anytime from the Help menu. Happy editing!',
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial = ({ onComplete, onSkip }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate card position based on target position
        const cardWidth = 400;
        const cardHeight = 250;
        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'bottom':
            top = rect.bottom + 20;
            left = rect.left + rect.width / 2 - cardWidth / 2;
            break;
          case 'top':
            top = rect.top - cardHeight - 20;
            left = rect.left + rect.width / 2 - cardWidth / 2;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - cardHeight / 2;
            left = rect.right + 20;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - cardHeight / 2;
            left = rect.left - cardWidth - 20;
            break;
        }

        // Keep card within viewport
        top = Math.max(20, Math.min(top, window.innerHeight - cardHeight - 20));
        left = Math.max(20, Math.min(left, window.innerWidth - cardWidth - 20));

        setCardPosition({ top, left });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, step.target, step.position]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onSkip} />

      {/* Highlight Target Element */}
      {targetRect && (
        <div
          className="fixed border-4 border-primary rounded-lg pointer-events-none z-[101] animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tutorial Card */}
      <Card
        className="fixed z-[102] w-[400px] shadow-2xl"
        style={{
          top: step.target ? cardPosition.top : '50%',
          left: step.target ? cardPosition.left : '50%',
          transform: step.target ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{step.title}</CardTitle>
              <CardDescription className="mt-2">
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious} size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <Button onClick={handleNext} size="sm">
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                'Finish'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};
