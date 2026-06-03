
import { Footer, FooterBrand, FooterCopyright, FooterDivider, FooterLinkGroup } from "flowbite-react";
import {HashLink} from "react-router-hash-link";

const currentYear = new Date().getFullYear();
function PageFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <Footer container className="mt-10 !bg-transparent">
            <div className="w-full text-center">
                <div className="w-full justify-between sm:flex sm:items-center sm:justify-between">
                    <FooterBrand
                        href="/"
                        src={"/TrialsOnco.png"}
                        alt="OncoTrials Logo"
                        name="OncoTrials™"
                        className="[&>span]:!text-black"
                    />
                    <FooterLinkGroup className="!text-black space-x-3">
                        <HashLink smooth to="/#about" className="hover:underline underline-offset-2">About</HashLink>
                        <HashLink to="/privacy-policy" className="hover:underline underline-offset-2">Privacy Policy</HashLink>
                        <HashLink smooth to="/#contact" className="hover:underline underline-offset-2">Contact</HashLink>
                    </FooterLinkGroup>
                </div>
                <FooterDivider />
                <FooterCopyright href="/" by="TrialsOnco™" year={currentYear} />
            </div>
        </Footer>
    );
}

export default PageFooter;
