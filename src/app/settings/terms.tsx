import { LegalScreen } from '@/components/legal-screen';

export default function Terms() {
  return (
    <LegalScreen
      title="Terms & Conditions"
      updated="July 2024"
      sections={[
        {
          heading: 'Acceptance',
          body: 'By using SPARx you agree to these terms. If you do not agree, please discontinue use of the app.',
        },
        {
          heading: 'Not medical advice',
          body: 'SPARx provides educational and coaching content for wellbeing. It is not a substitute for professional medical or mental-health treatment. If you are in crisis, contact your local emergency services.',
        },
        {
          heading: 'Your account',
          body: 'You are responsible for keeping your login secure and for the activity on your account. Please keep community spaces respectful and safe for everyone.',
        },
        {
          heading: 'Subscriptions',
          body: 'Premium subscriptions renew automatically until cancelled. You can manage or cancel any time through your app store or payment settings.',
        },
        {
          heading: 'Changes',
          body: 'We may update these terms occasionally. We will let you know about significant changes within the app.',
        },
      ]}
    />
  );
}
