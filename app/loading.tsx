import Image from 'next/image';

export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
            <div className="relative">
                <Image
                    src="/logo.svg"
                    alt="Loading..."
                    width={100}
                    height={100}
                    className="animate-coin-flip"
                />
            </div>
        </div>
    );
}
