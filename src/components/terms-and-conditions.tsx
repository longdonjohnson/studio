"use client";

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {useToast} from "@/hooks/use-toast";
import {Slider} from "@/components/ui/slider";
import {Card, CardContent, CardDescription as UICardDescription, CardHeader as UICardHeader, CardTitle as UICardTitle} from "@/components/ui/card";
import {Switch} from "@/components/ui/switch";
import {cn} from "@/lib/utils";

interface TermsAndConditionsProps {
}

const storageKey = "termsAccepted";
const launchCountKey = "launchCount";
const parentalControlsKey = "parentalControls";

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [launchCount, setLaunchCount] = useState(0);
  const [additionalControls, setAdditionalControls] = useState('');
  const [isModerationActive, setIsModerationActive] = useState(false);
  const [violenceLevel, setViolenceLevel] = useState([50]);
  const [sexualContentLevel, setSexualContentLevel] = useState([50]);
  const [hateSpeechLevel, setHateSpeechLevel] = useState([50]);
  const {toast} = useToast();

  useEffect(() => {
    // Check if terms have been accepted
    const accepted = localStorage.getItem(storageKey) === "true";
    setHasAccepted(accepted);

    // Get launch count
    const count = localStorage.getItem(launchCountKey);
    const launchNumber = count ? parseInt(count, 10) : 0;
    setLaunchCount(launchNumber);

    // Show dialog if not accepted and launch count is less than 3
    if (!accepted && launchNumber < 3) {
      setShowDialog(true);
    }

    // Increment launch count
    localStorage.setItem(launchCountKey, (launchNumber + 1).toString());
  }, []);

  const acceptTerms = () => {
    localStorage.setItem(storageKey, "true");
    setHasAccepted(true);
    setShowDialog(false);
    toast({
      title: "Terms & Conditions Accepted!",
      description: "You have accepted the terms and conditions. Happy chatting!",
    });
  };

  const disableDialog = () => {
    localStorage.setItem(launchCountKey, "4");
    setShowDialog(false);
    toast({
      title: "Terms & Conditions Disabled!",
      description: "The Terms & Conditions dialog will no longer appear.",
    });
  };

  const setParentalControls = () => {
    const parentalControls = {
      isModerationActive,
      violenceLevel: violenceLevel[0],
      sexualContentLevel: sexualContentLevel[0],
      hateSpeechLevel: hateSpeechLevel[0],
      additionalControls
    };
    localStorage.setItem(parentalControlsKey, JSON.stringify(parentalControls));
    toast({
      title: "Parental Controls Set!",
      description: "The parental controls have been saved.",
    });
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept the following terms and conditions to continue using KidenAI.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

          <Card>
            <CardContent className="grid gap-4 py-4">
              <UICardHeader>
                <UICardTitle>Safety & Usage</UICardTitle>
                <UICardDescription>
                  Welcome to KidenAI! By using KidenAI, you agree to the following terms:
                </UICardDescription>
              </UICardHeader>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms and Conditions</Label>
                <Textarea
                  id="terms"
                  className="resize-none"
                  readOnly
                  value={`
1. Safety: KidenAI is designed for children 13 and under. We use AI content filtering to ensure age-appropriate and safe content.

2. Parental Consent: By accepting these terms, you confirm that you are a parent or guardian of the child using this app and consent to their use of KidenAI.

3. No Liability: We are not responsible for any issues arising from the use of KidenAI.

4. Privacy: We do not collect personal information. All conversations are processed by the AI and are not stored.

5. API Usage: This app uses the Gemini 1.5 Flash API. Usage is subject to Google's AI Terms of Service.

6. Parental Controls: Parents can set additional filtering options for the AI’s responses.

7. Offline Games: When offline, a set of three playable, educational games will be available.

By clicking "Accept," you agree to these terms. If you do not agree, please discontinue use of KidenAI.
`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Switch id="moderation" onCheckedChange={(checked) => setIsModerationActive(checked)}/>
                <Label htmlFor="moderation">Enable Additional Moderation</Label>
              </div>
              {isModerationActive && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Additional moderation settings are active, building upon the default safety measures.
                  </p>
                  <div className="space-y-2">
                    <Label>Violence Level</Label>
                    <Slider
                      defaultValue={violenceLevel}
                      max={100}
                      step={1}
                      onValueChange={(value) => setViolenceLevel(value)}
                    />
                    <p>Selected violence level: {violenceLevel[0]}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Sexual Content Level</Label>
                    <Slider
                      defaultValue={sexualContentLevel}
                      max={100}
                      step={1}
                      onValueChange={(value) => setSexualContentLevel(value)}
                    />
                    <p>Selected sexual content level: {sexualContentLevel[0]}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Hate Speech Level</Label>
                    <Slider
                      defaultValue={hateSpeechLevel}
                      max={100}
                      step={1}
                      onValueChange={(value) => setHateSpeechLevel(value)}
                    />
                    <p>Selected hate speech level: {hateSpeechLevel[0]}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parental-controls">Additional Filtering Options</Label>
                    <Textarea
                      id="parental-controls"
                      placeholder="Enter any additional filtering options here..."
                      value={additionalControls}
                      onChange={(e) => setAdditionalControls(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-between">
          <Button onClick={acceptTerms}>Accept</Button>
          {launchCount < 3 && (
            <Button variant="secondary" onClick={disableDialog}>Disable for good</Button>
          )}
          <Button onClick={setParentalControls}>Set parental controls</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

    