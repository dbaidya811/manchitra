export interface FooterSectionProps {
  companyName: string;
  copyrightYear: number;
}

export default function FooterSection({
  companyName,
  copyrightYear,
}: FooterSectionProps) {
  return (
    <footer className="w-full py-6 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {copyrightYear} {companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
