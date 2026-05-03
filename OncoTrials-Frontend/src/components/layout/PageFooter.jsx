
import { Footer, FooterBrand, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";

const currentYear = new Date().getFullYear();
function PageFooter() {
    return (
        <Footer container className="mt-10 !bg-transparent">
            <div className="w-full text-center">
                <div className="w-full justify-between sm:flex sm:items-center sm:justify-between">
                    <FooterBrand
                        href="/"
                        src={"/TrialsOnco.png"}
                        alt="OncoTrials Logo"
                        name="OncoTrials™"
                        className="!text-black"
                    />
                    <FooterLinkGroup className="!text-black">
                        <FooterLink href="/about" className="hover:underline underline-offset-2">About</FooterLink>
                        <FooterLink href="/privacy-policy" className="hover:underline underline-offset-2">Privacy Policy</FooterLink>
                        <FooterLink href="/contact" className="hover:underline underline-offset-2">Contact</FooterLink>
                    </FooterLinkGroup>
                </div>
                <FooterDivider />
                <FooterCopyright href="/" by="TrialsOnco™" year={currentYear} />
            </div>
        </Footer>
    );
}

export default PageFooter;
