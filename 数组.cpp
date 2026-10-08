# include<iostream>
# include<cstring>   // memcpy
# include<cstdlib>   // srand, rand
# include<ctime>     // time
using namespace std;

class Array
{
    public:
    //参数是默认值10
      Array(int size = 10):mCur(0),mCap(size)
      {
        mpArr = new int[mCap]();
      }
      ~Array(){
        if (mpArr != nullptr)
        {
            delete []mpArr; //可以释放一个空指针 所以不用判空！
            mpArr = nullptr;

        }
      };
    public:
        //数组的增删改查
        //末尾增加元素 O(1)
        void push_back(int val){
            if (mCur == mCap){
                //数组满了，先扩容
                expand(2*mCap);
            }
            mpArr[mCur++] = val; //先写入，再让有效元素个数+1
        };
        //末尾删除元素 O(1)
        void pop_back()
        {   if(mCur == 0)  //数组为空
                {
                    return;
                }
            mCur--; //有效元素个数-1
        };
        //按位置增加元素 O(n)
        void insert(int pos,int val){
            if (pos < 0 || pos > mCur)
            {
                return;
            }
            if (mCur == mCap){
                //数组满了
                expand(2*mCap);
            }
            //从后往前移动元素，把 [pos, mCur-1] 整体右移一位
            for(int i = mCur; i > pos; i--){
                mpArr[i] = mpArr[i-1];
            }
            mpArr[pos] = val; //写入新值
            mCur++;           //有效元素个数+1
        };
        //按位置删除  O(n)
        void erase(int pos){
            if (pos < 0 || pos >= mCur)
            {
                return;
            }
            //从前往后移动，把 [pos+1, mCur-1] 整体左移一位
            for(int i = pos+1; i < mCur; i++){
                mpArr[i-1] = mpArr[i];
            }
            mCur--;
        }
        //元素查询
        int find(int val){
            for(int i = 0;i < mCur;i++){
                if(mpArr[i] == val)
                {
                    return i;
                }
            }
            return -1;
        };
        //输出数据
        void show() const{
            for(int i = 0;i <mCur;i++){
                cout<<mpArr[i]<<" ";
            }
            cout<<endl;
        }
    private:
      int* mpArr; //指向可扩容的数组内存
      int mCap;  //数组的容量
      int mCur;   //数组的有效元素个数
      //内部数组扩容接口
      void expand(int size)
      {
            int *p = new int[size];
            memcpy(p,mpArr,sizeof(int)*mCap);
            delete []mpArr; //释放旧内存，避免泄漏
            mpArr = p;
            mCap = size;
      }
};

int main(){

    Array arr;
    //随机填充一些值
    srand(time(0));
    for (int i = 0;i < 10;i++){
        arr.push_back(rand()%100); //rand() 生成从0到rand_max的随机数 对100取余得到0-99的随机数
    }
    arr.show();
    arr.insert(0,100);
    arr.erase(1);
}
