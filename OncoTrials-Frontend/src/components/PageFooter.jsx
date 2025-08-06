
import { Footer, FooterBrand, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";

function PageFooter() {
    return (
        <Footer container className="mt-10 !bg-transparent">
            <div className="w-full text-center">
                <div className="w-full justify-between sm:flex sm:items-center sm:justify-betwee">
                    <FooterBrand
                        href="http://localhost:5173/"
                        src={"/OncoTrials.png"}
                        alt="OncoTrials Logo"
                        name="OncoTrials™"
                    />
                    <FooterLinkGroup className="!text-black">
                        <FooterLink href="#" className="hover:underline underline-offset-2">About</FooterLink>
                        <FooterLink href="#" className="hover:underline underline-offset-2">Privacy Policy</FooterLink>
                        <FooterLink href="#" className="hover:underline underline-offset-2">Licensing</FooterLink>
                        <FooterLink href="#" className="hover:underline underline-offset-2">Contact</FooterLink>
                    </FooterLinkGroup>
                </div>
                <FooterDivider />
                <FooterCopyright href="#" by="OncoTrials™" year={2025} />
            </div>
        </Footer>
    );
}

export default PageFooter;
