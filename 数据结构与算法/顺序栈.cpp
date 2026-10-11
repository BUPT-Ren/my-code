
# include<iostream>
# include<cstring>
using namespace std;

//顺序栈 C++容器适配器 stack  : push pop top empty size 
//基于动态数组 定义在堆内存上
class SeqStack{
    public:
        SeqStack(int size = 10):
            mtop(0),  //栈没有元素
            mcap(size)
            {
                mpStack = new int[mcap];
            }
        ~SeqStack(){
            delete[]mpStack;
            mpStack = nullptr;
        }
    public:
        //入栈
        void push(int val){
            if (mtop == mcap){
                //栈扩容
                //expand写成内部接口 
                expand(2*mcap);
            }
            //mpStack[mtop++] = val;
            mpStack[mtop] = val;
            mtop++;
        }
        //出栈 栈顶出
        void pop(){
            //先判断栈是否为空
            if (mtop == 0){
                throw "栈为空";
            }
            mtop--;
        }
        //获取栈顶元素
        int top() const{
            if(mtop == 0){
                throw "栈顶为空";
            }
            return mpStack[mtop - 1];
        }
        bool empty() const {
            return mtop == 0; //等于0 空
        }
         int size() const{
            return mtop;
        }
    private:
        void expand(int size){
            int *p = new int[size]; 
            //把原来的拷贝过来
           /*  for (int i = 0; i < mtop; ++i){
                p[i] = mpStack[i];
            } */
           //memcpy按照字节拷贝 
           //字符串函数
           memcpy(p,mpStack,mtop*sizeof(int));
            delete[]mpStack;
            mpStack = p;
            mcap = size;
        }
       
    private:
        int *mpStack;
        int mtop; //或者指针
        int mcap; //定义栈容量
};

int main(){
    //容量设为3，方便测试扩容
    SeqStack s(3);

    //1. 空栈判断
    cout << "empty: " << s.empty() << endl;
    cout << "size: " << s.size() << endl;

    //2. 入栈 + 栈顶 + size
    s.push(10);
    s.push(20);
    s.push(30);
    cout << "size after 3 push: " << s.size() << endl;
    cout << "top: " << s.top() << endl;

    //3. 触发扩容（第4个元素）
    s.push(40);
    cout << "size after expand: " << s.size() << endl;
    cout << "top: " << s.top() << endl;

    //4. 出栈，验证顺序和扩容后数据完整
    cout << "pop sequence: ";
    while (!s.empty()){
        cout << s.top() << " ";
        s.pop();
    }
    cout << endl;
    cout << "size after all pop: " << s.size() << endl;

    //5. 空栈抛异常
    SeqStack e;
    try {
        e.pop();
    } catch (const char* msg){
        cout << "pop on empty -> " << msg << endl;
    }
    try {
        e.top();
    } catch (const char* msg){
        cout << "top on empty -> " << msg << endl;
    }

    return 0;
}