import Header from "../components/Header";

export default function UserInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">사용자 정보</h1>
          <p className="text-center">사용자 정보 페이지입니다.</p>
        </div>
      </div>
    </div>
  );
}
