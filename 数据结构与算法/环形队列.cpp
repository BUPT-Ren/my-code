# include<iostream>
# include<cassert>
using namespace std;

//环形队列 不涉及 元素的移动
class Queue{
    public:
        Queue(int size = 10):
            cap_(size),
            front_(0),
            rear_(0)
            {
                pQue = new int[cap_];
            }
        ~Queue(){
            delete []pQue;
            pQue = nullptr;
        }
    public:
        // Queue push pop front(获取队头元素) back empty size 
        //入队
        void push(int val){
            if ((rear_ + 1) % cap_ == front_){
                expand(2*cap_);
            }
            pQue[rear_] = val;
            //这样才能形成环形队列
            rear_ = (rear_ + 1) % cap_;
        }
        //出队
        void pop(){
            if (front_ == rear_){
                throw "the queue is empty";
            }
            front_ = (front_ + 1) % cap_;
        }
        //获取队头元素
        //涉及元素  const
        int front() const {
            if (front_ == rear_){
                throw "the queue is empty";
            }
            return pQue[front_];
        }
        //获取队尾元素
        int back() const{
            if (front_ == rear_){
                throw "the queue is empty";
            }
            //注意不是 Que[rear_ - 1] 因为rear_ 
            //可能直接跳到 0号位
            //此时 Que[-1] 就非法
            return pQue[(rear_ - 1 + cap_) % cap_];
        }
        bool empty() const{
            return front_ == rear_;
        }
        //队列元素的个数（遍历 O(n)）
        int size() const {
           int cnt = 0;
           for (int i = front_; i != rear_; i = (i + 1) % cap_){
                cnt++;
           }
           return cnt;
        }
    private:
        void expand(int size){
            //这里不能直接进行memcpy
            //因为你拷贝过来 front_ 和 rear_ 还是满足队满的条件 但此时已经扩容
            int *p = new int[size]; //申请新内存
            int j = front_;  //遍历我们的旧队列
            int i = 0;  //这个地方i++就可以 因为新的队列是空队列 还没有出队
            for(; j != rear_; j = (j + 1) % cap_, i++){
                p[i] = pQue[j];
            }
            delete []pQue;
            pQue = p;
            cap_ = size;
            front_ = 0;
            rear_ = i;
        }
    private:
        int *pQue; //指向堆上的内存
        int cap_; //空间容量
        int front_; //队头
        int rear_ ; //队尾
};

int main(){
    // 测试1：基本入队 + 容量上限（cap=5 最多放 4 个）
    Queue q(5);
    for (int i = 1; i <= 4; i++) q.push(i);
    assert(q.size() == 4);
    assert(q.front() == 1);
    assert(q.back() == 4);
    assert(!q.empty());

    // 测试2：触发扩容
    q.push(5); // 扩容到 cap=10
    assert(q.size() == 5);
    assert(q.back() == 5);
    q.push(6);
    assert(q.size() == 6);

    // 测试3：出队
    q.pop();
    assert(q.front() == 2);
    assert(q.size() == 5);

    // 测试4：环形回绕（front/rear 绕一圈）+ 回绕后扩容
    Queue r(5);
    r.push(1); r.push(2); r.push(3); r.push(4);
    r.pop(); r.pop();          // front 前进到 2
    r.push(5); r.push(6);      // rear 回绕到 0、1
    assert(r.size() == 4);
    assert(r.front() == 3);
    assert(r.back() == 6);
    r.push(7);                 // 触发扩容，且数据跨过回绕点
    assert(r.size() == 5);
    assert(r.front() == 3);
    assert(r.back() == 7);

    // 测试5：空队列相关操作
    Queue e(3);
    bool threw = false;
    try { e.pop(); } catch (...) { threw = true; }
    assert(threw);
    threw = false;
    try { e.front(); } catch (...) { threw = true; }
    assert(threw);
    threw = false;
    try { e.back(); } catch (...) { threw = true; }
    assert(threw);
    assert(e.empty());
    assert(e.size() == 0);

    cout << "all tests passed" << endl;
    return 0;
}