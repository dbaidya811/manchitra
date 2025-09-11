import { Template } from "@/lib/types";

export const templates: Template[] = [
  {
    id: "saas-landing",
    name: "SaaS Landing",
    description: "A professional landing page to convert visitors into customers for your software.",
    previewImage: "template-saas-preview",
    sections: [
      {
        id: "hero-2",
        component: "Hero",
        props: {
          headline: "Revolutionize Your Workflow",
          subheadline:
            "Our innovative platform streamlines your tasks, boosts productivity, and drives results. Join thousands of satisfied users today.",
          ctaText: "Start Free Trial",
          image: "saas-hero",
        },
      },
      {
        id: "features-1",
        component: "Features",
        props: {
          title: "Everything You Need, Nothing You Don't",
          description: "Explore the powerful features that make our platform the best choice for your business.",
          features: [
            {
              id: 'f1',
              title: "Intuitive Analytics",
              description: "Gain valuable insights with our easy-to-understand analytics dashboard.",
              image: "saas-feature-1",
            },
            {
              id: 'f2',
              title: "Seamless Integration",
              description: "Connect with your favorite tools and services in just a few clicks.",
              image: "saas-feature-2",
            },
            {
              id: 'f3',
              title: "Bank-Level Security",
              description: "Your data is safe with us. We use the latest security protocols to protect your information.",
              image: "saas-feature-3",
            },
          ],
        },
      },
       {
        id: "cta-2",
        component: "CTA",
        props: {
          title: "Ready to Dive In?",
          description:
            "Start your 14-day free trial now. No credit card required.",
          ctaText: "Sign Up Now",
        },
      },
      {
        id: "footer-2",
        component: "Footer",
        props: {
          companyName: "Innovate Inc.",
          copyrightYear: new Date().getFullYear(),
        },
      },
    ],
  },
];
