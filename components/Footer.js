import React from 'react';
import Image from 'next/image';
import logo from '../app/assets/logo/logo.png'
const Footer = () => {
    return (
        <footer className="w-full text-transparent bg-gradient-to-r bg-clip-text from-[#4ca6f5] to-[#6c63ff] py-3 flex-shrink-0 mt-auto poppins-semibold">
            <div className="max-w-[1200px] my-0 mx-auto flex justify-between items-center flex-wrap gap-[1rem]">
                <div className="flex items-center gap-2">
                    <Image src={logo} alt="CloudX Logo" className="h-[40px] w-[40px]" priority/>
                    <span className="text-[1.2rem]  text-2xl text-transparent">CloudX PBL Project</span>
                </div>
                <p>Project made for PBL GEHU Haldwani</p>
                <div className="flex items-center gap-2">
                    <span>Made By-</span>
                    <span>Gaurav & Laxmi</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;