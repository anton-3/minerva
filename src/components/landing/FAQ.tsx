import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "./data";

export function FAQ() {
  return (
    <section className="py-24 bg-neutral-background px-6" id="faq">
      <div className="max-w-3xl mx-auto">
        <h2
          className="font-heading text-3xl md:text-4xl text-center mb-12"
          data-aos
        >
          Questions? We have answers.
        </h2>

        <Accordion type="single" collapsible className="space-y-4">
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-white rounded-xl border border-border-light px-6 data-[state=open]:shadow-soft transition-shadow"
              data-aos
            >
              <AccordionTrigger className="text-left font-semibold text-text-primary hover:no-underline py-5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-text-secondary pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
